---
title: Notes From Building An AI Credits Ledger
date: 2026-10-06
description: 'What started as a usage counter turned into a small accounting system: booked prices, decimal arithmetic, shared budgets, and numbers that have to agree.'
---

I have been working on a credits ledger for an AI application, which is one of those projects that looks pleasantly small when you describe it from far enough away.

Count the tokens. Convert them to credits. Subtract from a limit. Show a progress bar.

There. Billing infrastructure. We can all go outside.

Then the questions start arriving. Which tokens? At which price? What happens when the price changes? Does a user limit belong to the user, the organization, or the feature? If two administrators edit the limits at the same time, whose changes survive? Why does the total at the top of the page disagree with the rows underneath it by one cent?

The progress bar is still small. The thing behind it has acquired responsibilities.

What I ended up building was a usage ledger, a conversion layer, a limit resolver, and a few different ways of reading the same booked usage. The interesting part was learning where each responsibility belonged, especially once the numbers started serving both the product and the people trying to understand its economics.

These are the decisions and tradeoffs that shaped the system. The examples use a sample conversion row, illustrative usage amounts, and simplified pseudocode.

## Three numbers wearing the same coat

The first useful distinction was between tokens, credits, and monetary cost.

They all describe usage. They do not answer the same question.

Tokens describe what the model processed. Credits describe what the application charges against a product budget. Monetary cost describes the amount booked from the provider pricing table, in an explicit currency and unit.

It is tempting to compress these into one number called `usage` and let everyone interpret it according to their current emotional needs. That works until someone asks a financial question.

The cost calculation differentiates five token categories: uncached input, output, cache reads, five-minute cache writes, and one-hour cache writes. Each category has its own rate in the model's conversion row. We keep those counters separate through normalization, pricing, and storage.

For example, a conversion row can look like this:

```json
{
  "cost_per_1m_tokens": {
    "input": 500,
    "output": 2500,
    "cache_read": 50,
    "cache_write_5m": 625,
    "cache_write_1h": 1000
  }
}
```

Those amounts are currency subunits per million tokens. With a USD table, they are cents: `500` means $5 per million input tokens, and `50` means $0.50 per million cache-read tokens, before the multiplier.

The same number of output tokens therefore contributes five times the list-price cost of uncached input. Cache reads contribute one tenth. Writing a cache has its own cost, with separate rates for the two retention durations. Treating all of that as ordinary input would erase the economics of caching and misrepresent the cost of generating a response.

This is where the cost accounting stays fair to the actual kind of work being recorded: each category is priced at its configured rate, rather than pretending every token costs the same. A mixed call's list-price cost is the sum of those five contributions.

Credits have a separate rule in the current implementation: billed tokens are summed and multiplied by the model's effective credit multiplier. That product-budget calculation is flat across token categories, even though the monetary calculation is weighted. A cache read can therefore consume the same credits as an uncached input token while contributing a smaller monetary amount. The distinction matters when explaining the charge: differentiated cost accounting does not, by itself, mean differentiated credit consumption.

There is another detail worth spelling out: the current cost calculation applies the same multiplier to the weighted provider list-price amount. The stored cost is therefore a scaled amount, not an untouched provider invoice. If I later want to calculate margin against actual spend, I need the unscaled provider amount or reconciled invoice data, and a monetary value for the credits. Subtracting two conveniently adjacent fields does not create a margin report.

Names matter here. A field named `cost` can sound more authoritative than its formula deserves.

The useful calculation has roughly this shape:

```text
function price(usage, model, zone, table):
    rates = table.resolve(model, zone)
    multiplier = rates.credit_multiplier ?? table.credit_multiplier

    tokens = normalize_provider_usage(usage)
    credits = decimal(sum(tokens.values)) * multiplier

    list_cost = sum(
        decimal(tokens[kind]) * rates.subunits_per_million[kind]
        for kind in token_kinds
    ) / decimal("1000000")

    return {
        credits: credits,
        cost_subunits: list_cost * multiplier,
        cost_currency: table.currency
    }
```

The normalization step is doing real work. Some usage counters include cached tokens inside total input. Adding both counters without understanding that relationship can charge for the same tokens twice. In the routes we support, uncached input is derived by subtracting the cache categories from total input before pricing the categories separately.

That assumption belongs near the provider adapter and needs checking when a new route arrives. A field called `input_tokens` is a name, not a universal contract delivered by the heavens.

## Book the result while the price is known

The next decision was about history.

One possible design stores tokens and calculates credits whenever someone asks for a usage report. It is appealingly small. There is only one durable measurement, and the current conversion table does the rest.

Then someone edits the conversion table.

Yesterday's usage now has a different price. Last month's total moves even though nobody made another call. The application has quietly become capable of time travel, which is a fairly dramatic feature to introduce through a JSON edit.

The rule I wanted was simple: once usage is booked, its booked amounts stay booked.

At the moment the model reports usage, the conversion layer resolves the model and deployment zone, calculates credits and cost, and writes those amounts alongside the token counters. The cost currency travels with the amount. A later price change affects later bookings.

The conversion table itself is a reviewed asset shipped with the application. Services load it at startup. It has base model rows and zone-specific exceptions, rather than a complete duplicated table for every zone.

The table tells us how to price new usage. The ledger tells us what was already booked.

<img src="/images/credits-booking.svg" alt="Booking flow: provider usage is normalized and priced using the deployed conversion table. Token counts, booked credits, and booked cost with currency are persisted in daily ledger aggregates. Later table changes price new usage without recalculating existing bookings." />

This also gives the pricing code a useful boundary. It can be a pure function with decimal inputs and decimal outputs. It does not need to know about HTTP, an admin page, or how annoyed someone will be when their remaining balance reaches zero.

There is a limit to the historical claim, though. We store booked amounts; we do not copy the complete rate table into each booking. And the ledger aggregates usage into daily documents. It preserves the total booked under those calls' prices, including when different deployed versions contributed to the same day's aggregate, but it does not preserve a separate pricing explanation for every call.

If the requirement becomes “reproduce this individual charge from its exact historical rate sheet,” I would add explicit pricing provenance and a durable event-level record. Keeping yesterday's total stable and reconstructing every decision that produced it are different requirements.

That was a useful restraint. I wanted the historical amounts to be honest without pretending we had built a full invoicing system.

## A ledger can still be an aggregate

The storage shape is less elaborate than the word “ledger” might suggest.

The credits collection holds daily aggregates, separated by tenant, user identity, usage type, model, zone, and cost currency. Each model call increments the token counters, prompt count, credits, and cost for its aggregate key.

This is a practical shape for the questions we actually need to answer: how much did this user spend today, how much did the organization spend this month, and which models contributed to it?

Currency is part of the key because an amount without its currency is incomplete. If two currencies ever appear, their monetary totals need to stay separate unless an explicit conversion policy says otherwise. Credits can still have their own aggregation rules.

Atomic increments avoid the familiar read-modify-write race where two callers read the same old total and one overwrites the other's contribution. A unique index protects the aggregate key. Concurrent attempts to create the first document can race, and a bounded retry handles that duplicate-key collision.

But this is also where I had to be careful with the word “safe.”

An atomic increment is not an idempotent booking. Deliver the same usage event twice and both increments can succeed. A unique aggregate key prevents duplicate aggregate documents; it does not identify duplicate events.

If I needed replay-safe processing, I would introduce a stable event identifier and make deduplication part of the durable write protocol. That is a stronger guarantee than retrying an insert collision.

The daily aggregates are also updated in place. The append-only part of this design is the limit configuration history, which comes later. This is not double-entry accounting, and calling the collection a ledger does not make it one.

I like this distinction because it keeps the architecture proportional. A usage accounting system can be useful without claiming the guarantees of a bank balance. It still needs to be very clear about the guarantees it does have.

## Rounding is a policy decision with excellent camouflage

All of the arithmetic stays in decimals. The database stores decimal values as `Decimal128`. The API exposes displayed credits to two decimal places, using half-up rounding.

I expected this to be one of the boring parts.

It was boring in the same way that a door lock is boring until the door will not open.

The subtle problem is that rounding does not commute with addition. Take two reporting rows, each worth exactly `0.005` credits:

```text
Round each row, then add:
    0.01 + 0.01 = 0.02

Add exact rows, then round:
    round(0.005 + 0.005) = 0.01
```

Both answers follow a coherent rule. They cannot both describe the same displayed breakdown.

For the usage history payload, we chose a canonical display grain: user × model × day. Each of those rows is rounded once. The daily chart, user totals, model totals, and organization total are all folded from those same rounded rows.

That makes the page's arithmetic explainable. The chart and the table agree because they are different views of the same displayed building blocks.

The user indicator has a different shape. It reads exact ledger totals for its limit windows and rounds those totals at the boundary. That can differ slightly from a history report assembled from rounded rows. The important thing is to understand the difference rather than invent a promise that every aggregation will produce the same last decimal.

There was a second, smaller trap in `remaining`.

If exact usage is `1.005` and the total is `100.00`, displayed usage becomes `1.01`. If I independently round the exact remaining amount, `98.995`, it becomes `99.00`. The screen now claims that `1.01 + 99.00 = 100.00`.

The user is unlikely to admire our commitment to independently rounded quantities.

So the indicator derives remaining from the displayed pair:

```text
displayed_used = round_half_up(exact_used, 2)
displayed_total = round_half_up(exact_total, 2)
displayed_remaining = max(displayed_total - displayed_used, 0)
```

Enforcement still compares exact usage and exact limits. Display rules make the interface coherent; they do not rewrite the stored arithmetic.

This also affected where the reporting work happens. Moving a fold into the database sounds like an easy optimization, but its built-in rounding uses a different tie-breaking rule from our API. An optimization that changes a financial total has changed behavior, even if the query looks much more professional.

## Limits belong to buckets, usage belongs to features

The next source of confusion was the relationship between usage classification and budget policy.

A model call carries a usage type: search, support, exploration, creation, and so on. Those classifications are useful for attribution. They should not automatically create separate wallets.

We group them into two limit buckets: a general bucket and an AI-work bucket. Every supported usage type belongs to exactly one bucket. The mapping is explicit, and an unclassified value raises rather than quietly acquiring a default budget.

That gives us a useful separation. Reporting can explain which feature generated usage, while enforcement sums every feature sharing the same bucket.

If exploration and creation consume the same pool, checking only exploration would let the user spend through creation without that spend affecting the check. The query might be fast. The policy would be imaginary.

Each bucket has three possible limits: per user per day, per user per month, and per organization per month. A request can be blocked by any applicable window. Unlimited windows are absent from the user-facing list of limits.

The sources are intentionally different. The general bucket is driven by service settings. The AI-work bucket has tenant-configurable user limits and a separately resolved monthly organization allocation. That allocation has its own cache and a service-setting source for now, with procurement integration still a follow-up.

This boundary matters financially. Giving a user more daily room should not manufacture more credits for the organization. An administrator's distribution policy and the organization's allocation are separate decisions.

<img src="/images/credits-limits.svg" alt="Limit resolution: a usage type maps to one budget bucket. Service settings, versioned tenant defaults with user overrides, and the separate organization allocation feed a single resolver. The resolved daily user, monthly user, and monthly organization limits are compared with usage summed across the whole bucket." />

One resolver owns these decisions. The limiter and the user indicator ask it for effective limits instead of each learning their own version of the inheritance rules.

That sounds like a small organizational choice. It prevents the much stranger experience of a UI telling someone they have room left while the request path has independently decided otherwise.

## Missing, unlimited, and zero are three different things

Per-user overrides introduced a particularly compact source of bugs.

A user might inherit the tenant's daily limit while receiving a custom monthly limit. Another user might have no personal daily cap at all, while still sharing the organization's monthly allocation.

That requires three distinct states:

| Override value               | Meaning                       |
| ---------------------------- | ----------------------------- |
| Field absent                 | Inherit the tenant default    |
| Explicit `null`              | No limit for this user window |
| Numeric value, including `0` | Use this exact limit          |

Treating missing and `null` as interchangeable breaks inheritance. Treating zero as false is worse: a budget of zero can become an accidental invitation.

The pseudocode is small, but the membership check is the important part:

```text
function effective_user_limit(defaults, override, field):
    if field is present in override:
        return override[field]  // null means unlimited; zero stays zero

    return defaults[field]
```

There is a related distinction in editing. A partial update to the defaults preserves fields that were not sent. Replacing a user's override gives omitted fields their inheritance meaning again. Those are different operations, and the API has to say so.

An override is an exception to the default, not a frozen copy of the default. If the tenant later changes its daily limit, users who never overrode that field should receive the change.

This is one of those details that looks like serialization trivia until it decides who is allowed to spend.

## Configuration changes deserve a history too

For tenant-configurable limits, accepted edits append a new full version. They do not update the old document in place.

Each version includes who changed it and when it became effective. The latest version is the current policy. An edit that changes nothing creates no version, which keeps the audit trail from becoming a record of people clicking Save while thinking.

A tenant with no stored configuration reads a fixed seed at version zero. That seed preserves the old token-limit behavior at the credit cutover. It is not recomputed whenever someone changes an environment setting later. The first actual edit creates version one.

There is a useful migration lesson there: a default chosen to preserve old behavior should not keep moving underneath the migration.

Concurrent edits are handled with optimistic concurrency. Versions have a unique index. Before editing, the repository reads the persisted latest version, applies the requested change, and attempts to append the next version. If another writer wins, it reads again and reapplies the change to the winner's document.

Reapplying matters. Suppose one administrator changes the daily limit while another changes the monthly limit. Retrying the losing request's old full snapshot can erase the winning request's unrelated field. Retrying the intended edit against the new state preserves it.

The same rule applies to deciding whether an edit is a no-op. That comparison belongs against persisted state, not a replica's possibly stale cache.

Full snapshots make reads and audit inspection simple. They also grow with every accepted edit. We accepted that because edits are rare and the override list is bounded. Retention and compaction are still real future work if those assumptions stop being true.

## A budget check does not reserve a balance

The limiter checks already booked usage before allowing more work. If any finite applicable limit has been reached, enforcement blocks the request. Shadow mode records what it would have blocked while continuing to allow work.

This is useful for daily and monthly budgets. It is not a strict spending reservation.

If usage is at `99` against a limit of `100`, two concurrent requests can both see room. Both can proceed. Their final cost becomes known afterward. Even one request can exceed the remaining allowance if it generates enough output.

There is no clever comparison operator that fixes this. The missing primitive is a reservation.

A hard prepaid balance would need something like: atomically reserve an allowance, admit the work, settle actual usage, release the unused reservation, and recover abandoned reservations. The admission decision and the reservation would need to coordinate across replicas.

That is a different system with different failure cases. We chose coarse budget enforcement, and the implementation should be described that way.

Caching makes that choice more visible. The limiter uses a bounded local totals cache with a fifteen-minute default TTL. Local bookings bump the relevant cached totals. Another replica's bookings become visible through a refresh, so cross-replica enforcement can lag.

Limit configuration has its own five-minute local cache. The writing replica invalidates immediately; the other replicas converge when their entries expire. Organization allocations have a separate refresh policy and retain the last known value if refresh fails.

Those are three different kinds of staleness. Calling all of them “the credits cache” makes the behavior harder to reason about.

For the user indicator, we read usage directly from the ledger. Otherwise a message could finish on one replica and the next indicator request could land on another whose local total has not moved. Direct reads cannot make asynchronous bookings appear before they persist, but they avoid adding another cache delay to the number people are looking at.

## Failure behavior is part of the financial model

The failure policies are not uniform, and I think that is worth making explicit.

The credit limiter currently fails open when its dependencies fail: it logs the failure and allows the request. Booking failures are logged without failing the model call. Those choices favor availability, with a corresponding risk of unbounded or missing accounted usage during an incident.

The reporting endpoints take a different position. If the ledger or limits cannot be read, they return an unavailable response. They do not fabricate a zero.

Zero is a financial statement. “We could not retrieve the number” is an operational statement. Giving them the same payload would make an outage look like a remarkably quiet month.

Administrative authorization fails closed. The tenant comes from the authenticated identity, and a failed role lookup denies the edit. A problem reading usage should not become permission to change someone else's budget.

These decisions are worth discussing alongside prices and limits, because they decide what happens to spend when the infrastructure is unhappy. A system that prioritizes availability should have monitoring and a recovery story for its accounting gaps. Decimal arithmetic cannot rescue usage that was never successfully booked.

Shadow mode helps with the migration side of this. The credit checks can run alongside the existing token limiter and log their decisions before they become the sole enforcement path. That lets us compare behavior without turning every classification mistake into a blocked user.
