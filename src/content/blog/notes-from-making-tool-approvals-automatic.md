---
title: Notes From Making Tool Approvals Automatic
date: 2026-11-05
description: Declaring approval requirements on tools, enforcing them with LangGraph interrupts, and keeping a record of who authorized what before the side effect happens.
---

I have been working on giving an AI agent tools that can change things inside a product. Create content, update records, and eventually support more of the operations that make CRUD a slightly more consequential acronym than it looks.

The interesting part turned out to be the approval machinery around those tools.

For one tool, it is easy enough to add a confirmation step. Then a second tool arrives. Another agent needs the first one. Someone adds a different entry point. Before long, “remember to check approval here” has become an architectural dependency.

I prefer dependencies that can appear in a lockfile.

What I wanted was a way to declare that a tool requires approval and have the runtime automatically handle the rest: prepare the proposed action, suspend execution, accept an explicit decision, record who authorized it, and only then allow the side effect.

I wrote earlier about [teaching an agent to ask before touching things](/blog/notes-from-teaching-an-agent-to-ask-before-touching-things). This takes that boundary further into the tool infrastructure. The goal is a consistent, auditable authorization step wherever an approval-gated tool runs.

The examples below are simplified pseudocode with generic names. The first concrete write path was content creation; destructive operations are another reason to make this machinery reusable, rather than a claim that every delete operation is already exposed.

## Make the requirement part of the tool

The useful starting point was an annotation:

```python
@write_tool(
    name="modify-text",
    approval=ModificationPolicy(TEXT),
)
async def modify_text(operation, target, content):
    ...
```

That is application infrastructure, not a built-in LangChain decorator. Its job is to make the approval requirement executable.

The annotation stamps the tool with its write scope and approval metadata, and installs the wrapper that enforces the policy. An agent binding that tool gets the same approval behavior automatically.

The policy separates two responsibilities. `prepare` resolves the target, checks permissions, validates the input, and produces a concrete proposed change. `execute` performs the approved operation. The tool-specific policy knows what changing this kind of entity means; the shared runtime knows how to manage an approval lifecycle.

The gate is generic. Text is its first client. A different entity brings its own validation, payload, and execution rules, while using the same interruption, decision, and audit machinery. That is a much smaller job than teaching every new tool how to stop safely.

<img src="/images/tool-approval-lifecycle.svg" alt="Approval lifecycle: the tool annotation installs a wrapper that prepares the change, interrupts execution, records authorization and claims one attempt, rechecks permissions, executes, and retains the outcome. Denial or revision performs no write." />

*One tool annotation, one shared lifecycle. The authorization record exists before execution can begin.*

This is the automation I wanted. Adding a tool should mostly mean describing its operation and policy. It should not mean implementing another small approval service with slightly different opinions about what “yes” means.

There is also a registration check. The agent receives write tools through an explicit allowlist, and construction rejects a write tool that is outside that list or lacks the approval policy. The lower-level write operations stay internal.

That closes an easy hole: carefully wrapping one tool while exposing its unwrapped cousin through a broad `write` grant. The decorator does useful work only if the agent cannot walk around it.

## An interrupt has a specific job here

We use LangChain's graph runtime, LangGraph, and its [interrupts inside tools](https://docs.langchain.com/oss/python/langgraph/interrupts#interrupts-in-tools) pattern. The wrapper calls `interrupt()` before the side effect. A checkpointer preserves the paused execution, and a later request resumes it with a decision.

In this application, that interruption means a concrete operation is waiting for authorization.

Clarification has a separate meaning and a separate path. “Which document did you mean?” supplies missing context. The answer helps the model prepare an operation. It authorizes no write.

| Interaction | What it establishes | What follows |
| --- | --- | --- |
| Clarification | Missing context or intent | The agent can prepare a proposal |
| Approval interrupt | A decision on an identified operation | The runtime may execute that approved operation |

LangGraph's interrupt primitive is general enough to support different kinds of human input. This distinction is our application contract: approval resumes and clarification answers are different message types, with different effects.

That matters because the model should never interpret an ordinary conversational “yes” as permission to execute a pending destructive action. The runtime expects an identified approval decision through the approval path.

A user saying “yes, that document” has selected a document. They have not signed a surprisingly short power of attorney.

## Why the pause belongs inside the tool

The placement of the interrupt changes what the user can authorize.

A gate before the tool runs can show the arguments the model generated. Those may still contain an ambiguous destination, content that needs sanitizing, or an operation the user cannot perform. There is a difference between reviewing a request and reviewing the change that will actually reach the API.

For this flow, the tool's policy has the information needed to close that gap. It resolves the destination, checks access, builds the final payload, and derives the preview. Only then does the wrapper interrupt execution.

```text
Model arguments
      |
      v
PREPARE — read-only
Validate -> Resolve -> Authorize -> Read version -> Build -> Preview
      |
      v
INTERRUPT — decision on the prepared change
      |
      +-- Deny / revise -> Record decision; no write
      |
      +-- Approve
             |
             v
CLAIM — record authorization; consume it once
             |
             v
EXECUTE — recheck -> write -> record outcome
```

A middleware approach can work when its approval boundary already has the information the product needs. Here, putting the interrupt after preparation gives the card and the audit record the same concrete proposal to refer to.

The pause happens after we know what the operation means, while there is still time to prevent it. That is a useful place for a pause. Immediately after the write would be more of a dramatic effect.

## Prepare something worth authorizing

Before the interrupt, the policy produces a prepared change: the resolved target, the final payload, the preview, and a digest identifying the proposal.

For example, a request to create a document becomes a specific location and specific sanitized content. The application checks access before offering that operation for approval.

The prepared change is cached under the scoped tool-call ID. The approval refers to that stored proposal, and execution uses its payload. The model does not get another turn to improvise the arguments after the user approves them.

This makes the permission narrow enough to record meaningfully:

> This user approved this tool call, against this target, with this prepared change.

“User approved AI doing something” would be easier to store, but considerably less useful during an investigation.

The decision cannot override the tool arguments. A revision rejects the current proposal and gives the model feedback for a new one. Changed content needs a new approval. Missing or expired prepared state cannot silently be rebuilt under an old decision.

That last detail matters both for execution and for the audit trail. The record needs to identify the action that was actually authorized, rather than a nearby version that looked plausible enough.

## Let the wrapper own the lifecycle

Inside the wrapper, the main path looks roughly like this:

```python
from langgraph.types import interrupt

async def run_approval_tool(args, runtime, policy):
    # A resume must load the original proposal.
    # Only a fresh invocation may prepare a new one.
    prepared = await load_or_prepare(args, runtime, policy)

    decision = interrupt(prepared.approval_request)

    if decision["decision"] in {"deny", "revise"}:
        return await record_non_execution(prepared, decision, runtime)

    # Require approval and atomically claim one execution attempt.
    # The same operation retains the decision and actor for settlement.
    await claim_and_record_authorization(prepared, decision, runtime)

    # Recheck current access and relevant versions before any write.
    return await execute_and_record_outcome(prepared, runtime, policy)
```

The helpers hide storage and error handling. The important sequence is that the authorization record and execution claim exist before the external side effect can begin. If that claim cannot be established, the operation does not proceed.

On the request side, the application validates the pending approval's identity, proposal digest, deadline, and current state. Once the decision is accepted, it resumes the original execution:

```python
from langgraph.types import Command

await graph.ainvoke(
    Command(resume={
        interrupt_id: {"decision": "approve"},
    }),
    config={"configurable": {"thread_id": pending.thread_id}},
    context=current_request_context,
)
```

The authenticated request supplies the actor and fresh credentials. The model does not choose who approved its tool call, and credentials do not become part of the persisted graph state.

There is one framework detail that deserves attention: the interrupted task replays from its beginning on resume. Code before `interrupt()` can run again. That is why preparation is read-only with respect to product content and why the wrapper reuses the cached proposal. The interrupt itself must propagate through logging and retry wrappers as a pause, rather than being caught as an ordinary tool failure. These behaviors follow [LangGraph's interrupt rules](https://docs.langchain.com/oss/python/langgraph/interrupts#rules-of-interrupts).

A checkpoint gives the graph a way to continue. Our approval policy determines whether the operation is allowed to continue.

## Keep evidence before the side effect

The audit record is a central part of the feature.

A chat message saying “Done” tells us what the assistant reported. It does not, by itself, establish which operation was approved, who approved it, or whether execution succeeded.

We retain the tool call, the proposal shown to the user, the decision, the authenticated actor, and the server-recorded decision time. When execution produces a result, that outcome is attached to the same operation.

A simplified settled record might look like this:

```json
{
  "tool_call_id": "call-123",
  "tool_name": "modify-text",
  "proposal_digest": "sha256:...",
  "location": "Project workspace / Documents",
  "decision": "approve",
  "decided_by": { "username": "user-42" },
  "decided_at": "2026-11-04T19:30:00Z",
  "status": "completed",
  "result_id": "document-456"
}
```

This is an illustrative view of the information, not the exact storage schema. The saved approval also preserves the card details so history can show what the user reviewed.

The decision time and the execution outcome describe different facts. Approval can be followed by a permission failure, a stale version, or an uncertain external result. A record saying “approved” must not quietly become evidence that the change happened.

```text
Prepared proposal
      |
      v
Accepted approval decision
      |
      v
Atomic write claim + authorization record
      |
      v
Current permission and version checks
      |
      v
External operation
      |
      v
Stored execution outcome
      |
      v
Permanent conversation history
```

The temporary execution records survive long enough to settle the permanent history, even if the checkpoint expires or the final model response fails. Cleanup happens after that persistence is acknowledged.

This is an application audit trail within the conversation's retention policy. It does not automatically become an immutable compliance archive because we used the word “audit.” It does give us a structured account of the permission decision and its result, independent of how eloquently the model describes either one.

Crucially, the historical record cannot authorize another execution. Evidence that someone approved an action yesterday is not a reusable permission slip for today.

## The card is the visible part of the policy

I used the design of [shadcn's AI Elements Confirmation](https://ui.shadcn.com/docs/ai-elements/base/confirmation) for the approval card: a compact action description with explicit Deny and Approve controls. Our flow also supports proposing modifications.

<img src="/images/tool-approval-confirmation.png" alt="Confirmation card showing a proposed build-folder cleanup command with Deny and Approve buttons before execution." />

*The shadcn Confirmation example that informed the card design. This screenshot shows the UI pattern; our runtime supplies the approval policy and audit record.*

The intended card interaction presents the action, its destination, and the prepared change. Its decision goes back through the structured approval path, carrying the identifiers needed to match the pending operation. Rendering that preview is part of the integration contract: emitting an approval event from the backend is only useful if the client can display what the user is about to authorize.

The useful property is that every annotated tool can use the same interaction and leave the same kind of record. The tool provides the content; the runtime provides the lifecycle; the UI provides the decision surface.

There is one pending approval per conversation in this version. Additional gated operations wait for their own decisions. Approving one card does not authorize every other tool call the model happened to generate beside it.

The card gets a few tasteful buttons. The backend gets identity checks, expiration, persistence, and replay semantics. A fairly traditional division of labor in frontend development.

## Approval does not replace access control

There are two checks that need to remain separate.

The product's permissions establish whether this user can perform the operation. The approval records whether the user authorized this particular proposed action.

Both must hold at execution time.

The policy checks access while preparing the proposal and rechecks it with the resumed request's credentials before the write. A record may have become locked. The user's permissions may have changed. For version-sensitive updates, the underlying content may have changed too.

The Approve button cannot override those conditions. It also cannot turn a stale proposal into approval for a freshly generated replacement.

This is why tagging a tool with an approval requirement is useful infrastructure, but not the entire security model. The annotation connects the tool to the enforcement path; that path still has to validate the operation against the real product rules.

## A smaller job for every new tool

What I like about this approach is what the next tool author gets to avoid rebuilding.

They define the operation, its preparation and execution policy, and its approval requirement. The shared infrastructure handles interruption, decision validation, attribution, single-use execution, and settlement into history.

The model still decides which available tool could help with the task. The application has an explicit place to enforce the permission boundary and record how it was crossed.

That is the part I wanted to automate: carrying the approval requirement consistently from the tool definition all the way to the execution record.

By the time a destructive action runs, its authorization should already be a fact the system can point to. “The model seemed confident” can remain a personality trait.
