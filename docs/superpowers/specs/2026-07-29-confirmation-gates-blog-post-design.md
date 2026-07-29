# Confirmation Gates Blog Post Design

## Goal

Write a new post for the existing personal blog about why tool-using agents need confirmation gates. The post should lead with the general engineering principle, use the author's ConfirmationGate implementation as a concrete example, and retain the technical-but-playful voice of the existing “Notes” posts.

## Source of Truth

The implementation described in `signals-ai-services/docs/confirmation-gate-overview.html` is authoritative. It supersedes earlier planning details where they differ.

In particular:

- Paused state lives in the persisted conversation transcript, not in a separate Valkey record.
- Action approval and user input are distinct protocols that share a transport.
- Action approval authorizes one concrete tool call.
- A Boolean answer to a model-generated question is conversational input and authorizes no tool call.
- An approved tool result is persisted before the model continues, preventing retries from executing a non-idempotent mutation twice.

The article will generalize internal names and use illustrative pseudocode rather than reproduce private production code.

## Audience and Thesis

The audience is software engineers building agents that can call application tools. Readers should understand tool calling at a high level but should not need prior LangGraph experience.

The central thesis is:

> A confirmation gate is a capability boundary, not a conversational courtesy.

Models can decide that asking a question would be helpful, but they cannot be the only enforcement layer protecting destructive capabilities. The runtime must deterministically gate sensitive tools, while a separate user-input path lets the model pause for judgment without accidentally turning an answer into authorization.

## Working Title and Metadata

- Working title: **Notes From Teaching An Agent To Ask Before Touching Things**
- Target filename: `src/content/blog/notes-from-teaching-an-agent-to-ask-before-touching-things.md`
- Target length: 1,400–1,800 words
- Description direction: A practical note on putting a human checkpoint between an agent's confidence and real side effects.
- Publication date: the date the post is drafted

## Narrative Structure

### 1. The moment text becomes an action

Open with the difference between an agent that only generates text and one that can mutate tenant data. Tool calling turns a plausible-looking model decision into a database operation. Introduce the risk with restrained humor: confidence is useful until it arrives holding a delete tool.

### 2. Why prompting is not the safety boundary

Explain why “ask before destructive actions” in a system prompt is insufficient. The model may misunderstand scope, skip the instruction, or decide that the user already implied consent. Enforcement belongs in the runtime because the runtime owns the capability.

### 3. Two pauses with different meanings

Introduce the two protocols and make the distinction explicit:

- **Action approval** gates a concrete tool invocation selected by scope tags such as `write` or `admin`. Approval authorizes that exact call.
- **User input** carries a model-generated YES/NO question for an open-ended judgment call. The answer becomes conversation context and authorizes nothing by itself.

They may use the same request/streaming transport and similar UI, but they must remain different contract types.

### 4. The pause/resume lifecycle

Walk through the implementation at a conceptual level:

1. The model emits a gated tool call.
2. Middleware intercepts it before execution and raises a sentinel.
3. The streaming layer persists the pending `AIMessage` in the transcript and emits an approval-required event.
4. The client returns the approval ID and decision in a second request.
5. On approval, the runtime resolves and executes that exact tool call.
6. The resulting `ToolMessage` is persisted immediately.
7. The model resumes from the transcript and finishes its answer.

On decline, the runtime appends a synthetic declined result and lets the model continue gracefully.

### 5. The unglamorous details that make it safe

Cover the engineering details that turn a confirmation card into a reliable safety boundary:

- Match approvals to a specific tool-call ID.
- Expire stale approvals.
- Resolve the tenant-bound tool instance before falling back to a global registry.
- Put confirmation middleware outside/before retry middleware so the sentinel is not converted into an ordinary tool error.
- Persist successful mutation results before asking the model to continue.
- Detect an already-answered gate on retry and reuse its `ToolMessage`.
- Remove an orphaned pending gate when a fresh user turn abandons it.
- Consider multi-tool batches explicitly rather than accidentally approving more than the UI described.

### 6. Friction in proportion to consequence

Conclude that confirmation should not be added to read/search operations or every harmless interaction. The goal is not to make the agent timid. The goal is to keep exploration fast while reserving a small, explicit checkpoint for actions with meaningful side effects.

## Pseudocode Plan

Use the blog's existing `<script setup>` constants and `<ProsePre>`/`<ProseCode>` components. Include three or four short snippets.

### Scope-based middleware

Show a wrapper that gates tools based on scope tags and exact approved call IDs:

```python
async def wrap_tool_call(request, run_tool):
    scopes = set(request.tool.tags)
    needs_approval = bool(scopes & {"write", "admin"})

    if needs_approval and request.call_id not in approved_call_ids:
        raise ConfirmationRequired(request.tool_call)

    return await run_tool(request)
```

### Typed pause contracts

Show distinct event shapes for authorization and conversational input:

```ts
type ActionApprovalRequired = {
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
```

### Transcript-backed resume

Show how the pending call is recovered, executed or declined, eagerly persisted, and passed back to the model:

```python
pending = find_pending_gate(conversation, resume.id)

if resume.decision == "yes":
    tool = resolve_bound_tool(pending.tool_call.name)
    result = await tool.ainvoke(pending.tool_call.args)
else:
    result = ToolMessage("User declined this action.")

await conversation_store.append(result)
return await agent.astream([*conversation, result])
```

The prose must note that production code also checks expiry, tool-call identity, retry state, and error handling.

### Retry guard

Optionally use a compact final snippet if it improves the flow:

```python
if result := already_answered_gate(conversation, resume.id):
    return continue_agent(conversation)  # never run the mutation twice
```

## Voice and Style

- First-person, reflective, and practical.
- Technical explanations should remain accessible and avoid internal ticket or repository names.
- Humor should appear as brief pressure-release lines, not as a running bit.
- Favor concrete sentences and short paragraphs.
- Use headings to pace the implementation walkthrough.
- Avoid security theater language, exaggerated catastrophe scenarios, or claims that confirmation makes an agent universally safe.
- Preserve the blog's recurring preference for “boring in a good way” architecture.

## Accuracy Boundaries

- Do not claim that user confirmation prevents malicious tools, compromised runtimes, confused users, or all model mistakes.
- Make clear that the gate controls execution of selected capabilities; it is one layer in a larger authorization system.
- Do not describe a Boolean user-input answer as approval for an action.
- Do not describe Valkey or a side store as the persistence mechanism.
- Do not present LangGraph-specific middleware as the only valid implementation approach.

## Validation

Before delivery:

- Confirm the frontmatter matches the blog content loader.
- Confirm every snippet renders through the existing prose components.
- Run the project's normal build.
- Read the rendered article for heading rhythm, code overflow, and voice consistency.
- Check that unrelated working-tree changes remain untouched.

