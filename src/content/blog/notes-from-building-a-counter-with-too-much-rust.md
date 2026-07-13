---
title: Notes From Building A Counter With Too Much Rust
date: 2026-07-13
description: A small diary note about turning a tiny coffee counter into a Rust-backed library, because fun is a perfectly valid architectural requirement.
---

<script setup>
import architectureImage from '@/assets/img/wave-counter-architecture.png'
import previewImage from '@/assets/img/wave-counter-preview.png'

const vueSnippet = `<WaveCounter
  counter-key="coffee"
  endpoint="/api/waves"
  theme="light"
/>`

const fastApiSnippet = `from fastapi import FastAPI
from wave_counter import WaveCounter
from wave_counter.fastapi import create_router

app = FastAPI()
counter = WaveCounter(database_path="waves.sqlite3")
app.include_router(create_router(counter), prefix="/api/waves")`

const expressSnippet = `import express from 'express'
import { WaveCounter } from '@waves-counter/node'
import { createWaveRouter } from '@waves-counter/node/express'

const app = express()
const counter = new WaveCounter({ databasePath: 'waves.sqlite3' })

app.use(express.json())
app.use('/api/waves', createWaveRouter(counter))`

const rustSnippet = `store.record_event("coffee", event_id)?;
let total = store.get_counter("coffee")?;
let activity = store.analytics("coffee", window, now)?;`
</script>

There was no real need to turn the coffee counter on this website into a public library.

I should say that first, because it is the kind of sentence that keeps a project honest. Nobody was standing outside my window in the rain whispering, “please, Adrian, the world needs cross-runtime counter infrastructure.” No investor deck was harmed. No roadmap demanded it. The small coffee button in the header could have stayed a small coffee button in the header.

But also: where is the fun in that?

Some projects exist because they unlock a business. Some exist because they solve a painful problem. Some exist because there is a little technical goblin in your head saying, “I bet this could be cleaner if the core was Rust and the web frameworks only owned the web-framework-shaped parts.” It is important to listen to the goblin occasionally. Not always. That way lies Kubernetes for a personal notes app. But occasionally.

This started as a tiny interaction. Click a cup, count a coffee. Right-click or long-press it, see the last seven days. A toy, basically. A tiny celebration of doing something often enough that it becomes data.

<img :src="previewImage" alt="The coffee counter popover on the Adrian Latorre website" />

The obvious implementation was not complicated. I could have written one Python package for the FastAPI version of the site and one Node package for the Express version of whatever future app wanted it. Each package would own its database access, its validation, its event recording, its totals, and its analytics buckets.

That would have worked.

It also would have meant writing the same little domain twice, then spending the rest of the project pretending the two implementations would stay perfectly aligned because I am a disciplined adult with a calendar and a deep love of duplicated edge cases.

This is where the Rust idea became interesting.

## The small useful constraint

The constraint I wanted was simple: one canonical counter brain.

Rust would own the domain and persistence layer. It would know how to create the SQLite schema, run migrations, record events atomically, calculate totals, build UTC activity windows, validate keys, and return domain errors. It would not know about FastAPI. It would not know about Express. It would not know that Vue exists, because Rust has suffered enough.

The web frameworks would own HTTP. Python would expose a FastAPI router. Node would expose an Express router. The browser package would speak the shared HTTP contract. The Vue package would make that contract feel nice in an app.

That gave the project a shape I liked.

<img :src="architectureImage" alt="Architecture diagram for Wave Counter showing Vue, browser client, FastAPI and Express adapters, native bindings, and a Rust core" />

Small historical footnote: the diagram came from the planning phase, back when the package name was still wearing its first outfit. The published packages are under `@waves-counter`, plural, because apparently even tiny libraries need a naming arc.

## The boring version would have been easier

The boring version is worth respecting, because boring is often correct.

For Python, I could have made a package that uses `sqlite3`, creates a table, records a row, and returns totals. For Node, same thing with `better-sqlite3` or another driver. The APIs would look almost identical. The tests would look almost identical. The bugs would be cousins.

And honestly, for many projects, that is the right answer. If the logic is tiny, the team is small, and the risk of drift is low, duplication can be cheaper than cleverness. There is a very real category of engineering mistake called “I built a cathedral to store one sandwich.”

But this was not only about shipping a counter. It was about exploring a boundary.

Could the domain be shared without forcing every runtime to become weird? Could Python still feel like Python? Could Node still feel like Node? Could the browser client stay framework-neutral? Could the Vue component feel polished and boring to install, while the inside of the package quietly contains a tiny Rust engine wearing sensible shoes?

That was the fun part.

## The Rust core

The Rust core is the part of the project that tries to be emotionally unavailable. It does not care about your button. It does not care about your framework. It receives counter keys and event identifiers, writes to SQLite, and answers questions.

In spirit, the core is basically this:

<ProsePre
  language="rust"
  :code="rustSnippet"
>
  <ProseCode class="language-rust">
{{ rustSnippet }}
  </ProseCode>
</ProsePre>

The important bit is not the exact method names. The important bit is ownership. SQLite schema, migrations, atomic writes, validation, and domain errors live in one place. If the event-recording semantics change, they change once.

That is especially useful for analytics windows. “Show me the last seven days” sounds easy until you ask which timezone owns the buckets, whether empty days should appear, what happens around midnight, and whether the UI should compare against a previous window. None of that is hard in isolation. It just becomes annoying when every runtime gets to improvise.

UTC buckets are not glamorous. They are the beige cardigan of analytics infrastructure. But beige cardigans are warm, and bugs hate warmth.

## The native bindings

Once the core existed, the next question was how to make it feel native from the outside.

For Python, the answer was PyO3 plus maturin. The package builds wheels that expose the same underlying counter store to Python. FastAPI then gets a small router that translates HTTP requests into calls against that store.

<ProsePre
  language="python"
  :code="fastApiSnippet"
>
  <ProseCode class="language-python">
{{ fastApiSnippet }}
  </ProseCode>
</ProsePre>

For Node, the answer was napi-rs. The Node package exposes prebuilt native bindings, and the Express adapter does the same sort of translation on the JavaScript side.

<ProsePre
  language="ts"
  :code="expressSnippet"
>
  <ProseCode class="language-ts">
{{ expressSnippet }}
  </ProseCode>
</ProsePre>

The boundary matters. I did not want web framework code crossing into Rust. Rust should not be parsing Express request objects in a trench coat. FastAPI and Express already know how to be FastAPI and Express. The core only needs to know the counter domain.

That separation is the part of the design I still like most. Each layer gets to stay itself.

## The browser side

The browser client is deliberately smaller than the component. It knows how to call the HTTP contract, record optimistic events, fetch totals, and ask for activity. It does not know what a popover should look like. It does not have opinions about icons. It does not wake up in the morning thinking about border radius.

The Vue package sits above it and does have opinions about those things, politely.

<ProsePre
  language="vue"
  :code="vueSnippet"
>
  <ProseCode class="language-vue">
{{ vueSnippet }}
  </ProseCode>
</ProsePre>

The component is the part people actually touch. It handles the button, the loading states, the right-click or long-press analytics panel, the little SVG chart, and the theme. After building the darker first version, I added light, dark, and auto themes because a public component should not force your website to dress like it is sneaking into a jazz club at 1 a.m.

On this site I use the light version, because the homepage is warm and paper-ish and the counter should feel like it belongs there rather than like it opened a portal to a different product.

## The nice thing about unnecessary projects

There is a strange freedom in building something that does not need to exist.

You still owe it care, especially if you publish it. The README should be useful. The package names should be correct. The install path should not require a treasure map. CI should work. The API should be understandable to someone who is not currently living inside your head.

But the project can also be a playground. It can be a place to test a shape. It can answer a question that has been quietly bothering you. In this case, the question was: what does a tiny cross-runtime library feel like when Rust owns the durable domain, Python and Node own framework integration, and the frontend packages stay clean?

The answer is: pretty nice, with occasional sharp edges, and a surprising amount of satisfaction when the same little counter brain shows up in multiple places.

Also, it is funny. I cannot overstate how important that is. There is something deeply unserious about using Rust, PyO3, maturin, napi-rs, FastAPI, Express, SQLite, a browser client, and a Vue component so a website can say I drank three coffees.

But unserious does not mean useless.

Sometimes unserious is how you learn where the serious boundaries are.

## What I would keep

I would keep the Rust core. That was the point of the experiment, and it made the rest of the design clearer. I would keep the HTTP contract as the seam between server packages and browser packages. I would keep the Vue component small enough that React and Svelte adapters can eventually sit next to it instead of orbiting a giant framework-specific planet.

I would also keep the little rule that made the whole thing coherent: domain and persistence live below the native boundary; framework behavior lives above it.

That rule prevented the project from becoming soup.

And if you are going to overbuild a coffee counter, the least you can do is avoid soup.

So no, there was no need.

But there was curiosity, a tiny UI, a clean constraint, and the pleasure of making a small thing feel real.

That is enough reason for me.
