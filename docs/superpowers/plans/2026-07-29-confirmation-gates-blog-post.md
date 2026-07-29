# Confirmation Gates Blog Post Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a technical, humorous “Notes” article explaining why agent confirmation gates matter and illustrating the author's implementation with pseudocode.

**Architecture:** Add one self-contained Markdown/Vue blog entry that follows the existing frontmatter and code-block conventions. Lead with the capability-boundary argument, briefly situate the work beside LangChain and AI SDK primitives, then explain framework-gated approval, model-driven HITL questions, pause/resume, and retry safety.

**Tech Stack:** Vue 3 Markdown SFCs, `unplugin-vue-markdown`, existing `ProsePre`/`ProseCode` components, Vite, Vitest.

## Global Constraints

- Use `docs/superpowers/specs/2026-07-29-confirmation-gates-blog-post-design.md` as the article specification.
- Treat `/Users/a2023362/workspace/signals-ai-services/docs/confirmation-gate-overview.html` as the source of truth for the implemented architecture.
- Target 1,400–1,800 words in a first-person, reflective, technical-but-playful voice.
- Keep the current implementation's user-input protocol Boolean; mention free-text and multi-choice interviews only as extensions.
- Do not expose internal tickets, tenant names, repository names, endpoints, or production code.
- Cite official LangChain and AI SDK documentation for current framework capabilities.
- Do not modify the user's existing `.claude/settings.json` change.

---

### Task 1: Draft the confirmation gates article

**Files:**

- Create: `src/content/blog/notes-from-teaching-an-agent-to-ask-before-touching-things.md`
- Reference: `src/content/blog/notes-from-building-a-counter-with-too-much-rust.md`
- Reference: `src/content/blog/notes-from-trying-to-use-chat-as-the-default-ui-for-ai.md`

**Interfaces:**

- Consumes: Markdown frontmatter with `title`, `date`, and `description`; globally registered `ProsePre` and `ProseCode` Vue components.
- Produces: A blog module discoverable by the existing `import.meta.glob('../content/blog/*.md')` loaders.

- [ ] **Step 1: Add frontmatter and pseudocode constants**

Create the file with this metadata:

```yaml
---
title: Notes From Teaching An Agent To Ask Before Touching Things
date: 2026-07-29
description: A practical note on putting a human checkpoint between an agent's confidence and real side effects.
---
```

Add a `<script setup>` block containing escaped template-string constants for:

1. `gateMiddlewareSnippet`: Python-like scope-tag middleware that raises `ConfirmationRequired` before a non-approved `write` or `admin` tool executes.
2. `protocolSnippet`: TypeScript-like `ActionApprovalRequired` and `UserInputRequired` event contracts, keeping the latter Boolean.
3. `resumeSnippet`: Python-like recovery of a pending tool call, exact tool resolution, approve/decline result creation, eager persistence, and model continuation.
4. `retrySnippet`: Python-like detection and reuse of an already-persisted `ToolMessage`.

- [ ] **Step 2: Write the narrative in the approved order**

Draft 1,400–1,800 words using these exact conceptual sections:

1. Opening without a heading: generated text becomes a real side effect when the agent receives mutation tools.
2. `## The prompt is not the lock`: explain why a system-prompt instruction cannot enforce capability policy.
3. `## You may not need to build this yourself`: link to [LangChain's HITL middleware](https://docs.langchain.com/oss/python/langchain/human-in-the-loop) and [AI SDK tool execution approval](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#tool-execution-approval); mention LangChain approve/edit/reject plus checkpointer-backed interrupts and AI SDK `needsApproval` plus argument-dependent policies.
4. `## Two reasons to stop`: distinguish deterministic action authorization from model-driven Boolean interview questions. Include examples covering interpretation, approach, preference, risk posture, and whether to continue.
5. `## Putting the gate where the power lives`: render `gateMiddlewareSnippet` and explain scope tags plus exact call IDs.
6. `## Pause now, continue later`: render `protocolSnippet` and `resumeSnippet`; explain the two-request lifecycle without dwelling on transcript storage.
7. `## The retry problem`: render `retrySnippet`; explain eager result persistence and why non-idempotent tools must not execute twice.
8. `## The boring details are the safety feature`: cover expiry, tenant-bound tool resolution, middleware ordering, decline handling, abandoned gates, and multi-tool batches.
9. `## Friction should have a budget`: conclude that reads/searches stay fast while meaningful side effects receive an explicit human checkpoint.

Use short humor beats in the style of the existing posts. Avoid a fictional disaster, security-theater claims, and jokes that obscure the contract semantics.

- [ ] **Step 3: Run the focused content test**

Run:

```bash
npx vitest run src/content/blog/frontmatter-exports.test.ts
```

Expected: the frontmatter export suite passes and includes the new Markdown module without a compilation error.

- [ ] **Step 4: Check article scope and sensitive terminology**

Run:

```bash
wc -w src/content/blog/notes-from-teaching-an-agent-to-ask-before-touching-things.md
rg -n "CLN-|signals-ai|tenant data|Valkey|confirmation-gate-overview" src/content/blog/notes-from-teaching-an-agent-to-ask-before-touching-things.md
```

Expected: word count is approximately 1,400–1,800 including snippets; `rg` returns no internal identifiers or implementation-document references. Generic discussion of tenant-bound tool resolution is allowed, but the phrase `tenant data` should not appear.

- [ ] **Step 5: Commit the draft**

```bash
git add src/content/blog/notes-from-teaching-an-agent-to-ask-before-touching-things.md
git commit -m "feat: add confirmation gates blog post"
```

### Task 2: Validate rendering and polish the article

**Files:**

- Modify if needed: `src/content/blog/notes-from-teaching-an-agent-to-ask-before-touching-things.md`

**Interfaces:**

- Consumes: the completed Markdown/Vue blog module from Task 1.
- Produces: a build-valid and visually reviewed article ready for publication.

- [ ] **Step 1: Run static validation**

Run:

```bash
npm run type-check
npm run build
```

Expected: both commands exit successfully; Vite emits the production bundle in `dist/`.

- [ ] **Step 2: Inspect the rendered article**

Start the existing application using its normal development command, open:

```text
/blog/notes-from-teaching-an-agent-to-ask-before-touching-things
```

Check:

- title, date, and description render;
- all code blocks are highlighted and do not overflow their containers;
- links point to the official framework documentation;
- headings create a readable rhythm on desktop and mobile widths;
- no raw Vue template syntax is visible;
- the final section ends on the capability-boundary thesis rather than implementation trivia.

- [ ] **Step 3: Apply prose-only corrections**

If inspection finds issues, modify only the article. Preserve the approved technical distinctions:

- action approval authorizes one exact call;
- Boolean interview answers authorize nothing;
- built-in framework support does not replace product policy;
- eager persistence prevents duplicate mutation execution on retry.

- [ ] **Step 4: Re-run final verification**

Run:

```bash
npx vitest run src/content/blog/frontmatter-exports.test.ts
npm run type-check
npm run build
git diff --check
```

Expected: all commands succeed with no whitespace errors.

- [ ] **Step 5: Commit any polish**

If Step 3 changed the article:

```bash
git add src/content/blog/notes-from-teaching-an-agent-to-ask-before-touching-things.md
git commit -m "fix: polish confirmation gates article"
```

If Step 3 made no changes, do not create an empty commit.
