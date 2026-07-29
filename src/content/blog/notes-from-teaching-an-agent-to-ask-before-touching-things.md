---
title: Notes From Teaching An Agent To Ask Before Touching Things
date: 2026-07-29
description: A practical note on putting a human checkpoint between an agent's confidence and real side effects.
---

<script setup>
const gateMiddlewareSnippet = `async def wrap_tool_call(request, run_tool):
    scopes = set(request.tool.tags)
    needs_approval = bool(scopes & {"write", "admin"})

    if needs_approval and request.call_id not in approved_call_ids:
        raise ConfirmationRequired(request.tool_call)

    return await run_tool(request)`

const protocolSnippet = `type ActionApprovalRequired = {
  type: "action-approval-required"
  approvalId: string
  toolCalls: ToolCall[]
  expiresAt: string
}

type UserInputRequired = {
  type: "user-input-required"
  inputId: string
  question: string
}

type UserInputResume = {
  type: "user-input-resume"
  inputId: string
  answer: "yes" | "no"
}`

const resumeSnippet = `pending = find_pending_gate(conversation, resume.id)

if resume.decision == "yes":
    tool = resolve_bound_tool(pending.tool_call.name)
    output = await tool.ainvoke(pending.tool_call.args)
else:
    output = "User declined this action."

result = ToolMessage(
    content=serialize(output),
    name=pending.tool_call.name,
    tool_call_id=pending.tool_call.id,
)

# Save the result before asking the model to continue.
await conversation_store.append(result)
return await agent.astream([*conversation, result])`

const retrySnippet = `result = already_answered_gate(conversation, resume.id)

if result:
    # The mutation already happened. Continue from its saved result.
    return continue_agent(conversation)

return execute_approved_tool(resume.id)`
</script>

An agent that only produces text can be wrong. It can invent an answer or misunderstand a request, but the result is still text. You can read it and ignore it.

Then you give the agent tools.

Now “I think the user wants this” can create a record, update a workflow, send an email, or delete something that had a plan for the afternoon.

This is the moment an agent stops being only a conversational interface and becomes an actor inside the product. The flexibility that makes it useful gives a probabilistic system access to deterministic side effects.

I ran into this while adding mutation tools to an agent. The tools worked. That was the problem.

The moment the model emitted a tool call, the runtime executed it. There was no place for the user to say, “yes, that is what I meant,” or the equally useful, “absolutely not.”

So I added a confirmation gate: a human-in-the-loop checkpoint that pauses the turn before a sensitive tool runs, shows the proposed action to the user, and resumes only after a decision.

The card is visible. The harder part is deciding where the pause belongs, what “yes” authorizes, and how to resume without running the same mutation twice.

## The prompt is not the lock

The first version of this idea can be written in one sentence:

> Before performing a destructive action, ask the user for confirmation.

Put that in the system prompt and the model will usually behave. Usually is a lovely word for restaurant recommendations. It is less comforting next to a delete tool.

A model can misunderstand whether an operation is destructive, infer consent from an earlier message, or simply miss the instruction. Prompts are guidance interpreted by the same component whose behavior we are trying to constrain.

The model still needs instructions about when to ask judgment questions and how to explain actions. But a prompt cannot enforce a capability owned by the runtime.

If the runtime owns the tool, the runtime should own the lock.

In my case, tools already had scope tags such as `read`, `write`, and `admin`. That made the policy pleasantly boring: allow reads to continue, intercept writes and administrative actions before execution.

The model can be creative about the plan. It does not get to be creative about whether the lock exists.

## You may not need to build this yourself

Human-in-the-loop tool approval is no longer an exotic feature that requires inventing every message type by hand.

[LangChain's human-in-the-loop middleware](https://docs.langchain.com/oss/python/langchain/human-in-the-loop) can interrupt configured tool calls and resume them with approve, edit, or reject decisions. It uses LangGraph persistence to save graph state across the interruption.

[Vercel's AI SDK tool execution approval](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#tool-execution-approval) provides `needsApproval` as a Boolean or a function of the tool arguments. Its UI helpers expose the corresponding approval states.

If those lifecycle and persistence models fit your application, use them. Infrastructure you do not have to maintain is one of the better kinds of infrastructure.

My agent already owned persistence, streaming, retries, and message cards outside LangGraph's checkpoint lifecycle. A custom gate fit those boundaries better. The lesson was not “everyone should build middleware.” It was that the product still owns the policy.

Which tools pause? How long is approval valid? What happens after rejection, abandonment, or a model failure after the mutation succeeds?

The library can give you a pause button. It cannot decide what pausing means in your product.

## Two reasons to stop

While working through the design, I found two different reasons an agent may need a human.

The first is action approval. The model has already proposed a concrete tool call:

```text
delete-record({ id: "123" })
```

The runtime pauses because that tool has a gated scope. The user is not answering a philosophical question about deletion. They are authorizing—or rejecting—that exact call with those exact arguments.

The second is an interview question. The model has reached a judgment point and needs input before it can choose a path:

- “Did you mean all records from this project?”
- “Should I use the safer migration approach?”
- “Do you prefer preserving the existing names?”
- “Should I continue if some items cannot be updated?”
- “Are you comfortable with the broader scope?”

My protocol keeps these questions Boolean. Free text and multiple choice are natural extensions, but also additional contracts, UI states, and opportunities to discover that “simple input” is a phrase software uses shortly before becoming forms.

The important part is that these two pauses do not mean the same thing.

An action approval grants permission to execute one identified tool call. An interview answer becomes conversation context. Answering “yes” to “should I explore the broader approach?” must not quietly approve a later mutation.

They can share a transport. They can share a card system. They should not share semantics.

## Putting the gate where the power lives

The framework gate sits around tool execution:

<ProsePre
  language="python"
  :code="gateMiddlewareSnippet"
>
  <ProseCode class="language-python">
{{ gateMiddlewareSnippet }}
  </ProseCode>
</ProsePre>

There are two checks doing most of the work.

The tool's scope decides whether the action needs approval. That policy comes from runtime metadata, not from the model remembering which names look dangerous. Approval is also tied to the tool-call ID. The runtime needs proof that this specific pending call was approved.

If the call is gated and not approved, the middleware raises a sentinel before handing control to the tool handler. The streaming layer catches it, persists the pending turn, emits an approval-required event, and ends the request cleanly.

No mutation has happened yet. That sentence is the whole feature.

## Pause now, continue later

I used two event contracts so authorization and conversational input remain visibly separate:

<ProsePre
  language="ts"
  :code="protocolSnippet"
>
  <ProseCode class="language-ts">
{{ protocolSnippet }}
  </ProseCode>
</ProsePre>

The client renders the appropriate card and sends a second request with the ID and decision. On resume, the runtime finds the pending call in the conversation, verifies that it still matches and has not expired, and then either executes it or creates a declined result.

The broad shape is:

<ProsePre
  language="python"
  :code="resumeSnippet"
>
  <ProseCode class="language-python">
{{ resumeSnippet }}
  </ProseCode>
</ProsePre>

This implementation keeps paused state in the transcript, but a framework checkpointer or pending-action store can work too. What matters is recovering the exact proposed call and continuing from a normal tool result.

That last part makes rejection much nicer. The model receives a tool result saying the user declined, then continues naturally: it can acknowledge the decision, offer an alternative, or ask a narrower question. Decline is not a transport error. It is a valid outcome.

## The retry problem

There is a small, unpleasant window after approval:

1. the tool executes successfully;
2. the model is asked to continue;
3. the model request fails.

If the user retries and the runtime only persisted the final model answer, it may execute the tool again. For idempotent reads, this is boring. For “create invoice” or “send message,” it is a sequel nobody requested.

The fix is to persist the `ToolMessage` immediately after execution, before asking the model to continue. A retry can then detect that the pending call already has a result:

<ProsePre
  language="python"
  :code="retrySnippet"
>
  <ProseCode class="language-python">
{{ retrySnippet }}
  </ProseCode>
</ProsePre>

The model can retry its explanation. The mutation cannot retry its existence.

This is the kind of detail that makes confirmation systems slightly less photogenic than the card in the UI. The card gets two tasteful buttons. The backend gets a careful discussion about idempotency and crash boundaries. Software remains committed to fairness.

## The boring details are the safety feature

Once the happy path worked, most of the remaining work lived in cases users should never have to notice.

Approvals expire, so an old tab cannot authorize a call whose context has gone stale. Resume resolves the request-bound tool instance first, because the globally registered version may not contain the configuration or credentials for the current conversation. The confirmation middleware sits outside the retry middleware, otherwise the retry layer may swallow the pause sentinel and turn it into an ordinary tool error.

If the user ignores the card and sends a fresh question, the abandoned gate is removed so the conversation does not carry an unanswered tool call forever. If the model proposes several gated tools in one turn, the UI and protocol need an explicit batch policy; “Approve” should never mean “and whatever else was nearby.”

None of these details changes the basic diagram:

```text
propose -> pause -> inspect -> decide -> resume
```

They just make the diagram survive contact with browsers, retries, expired sessions, multiple tools, and all the other places where a neat arrow learns humility.

## Friction should have a budget

Confirmation gates add friction. That is their job, but it does not mean they should appear everywhere.

Asking permission before every search would make the agent feel like a nervous intern requesting approval to open a spreadsheet. Reads and reversible exploration should stay fast. The checkpoint belongs where consequences become meaningful: writes, administrative actions, external communication, payments, destructive operations, and other capabilities where intent deserves one last look.

Even there, confirmation is not a complete security system. It does not replace authentication, authorization, audit logs, input validation, least-privilege tools, or careful product design. A user can approve a bad action. A compromised runtime can ignore the gate. A beautifully worded card can still hide important consequences.

The gate does one specific, valuable thing: it puts a human decision between a model's proposed action and the runtime capability that can make it real.

That boundary lets the agent remain useful without pretending confidence is consent.

Or, more simply: the agent can have the keys. It should still knock before rearranging the house.
