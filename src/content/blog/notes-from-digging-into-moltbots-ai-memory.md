---
title: Notes From Digging Into Moltbot’s AI Memory
date: 2026-01-29
description: A practical tour of agent memory files, indexing, and compaction—plus why “supermemory” feels like the missing piece.
---

<script setup>
import BlogCallout from '@/components/blog/BlogCallout.vue'
</script>

I didn’t sit down intending to analyze Moltbot’s memory system.

This started much more casually.

I was just using it. Over days, then weeks. Long conversations, pauses in between, switching devices, coming back later. Nothing dramatic — just the normal way you’d expect a personal assistant to behave over time.

And slowly I started noticing small frictions. Not bugs. More like moments where I’d hesitate and think: didn’t we already talk about this?

That feeling sent me down a path of trying to understand, very concretely, how Moltbot actually remembers things.

Not whether it is good or bad — just how it works.

## Starting from the simplest observation

The first thing that became obvious once I looked at the repository is that “memory” is not abstract at all. It’s tangible.

It writes things to disk. Plain text. Plain Markdown.

Once I internalized that, my questions became much more practical.

- If memory is just files, what happens when there are a lot of them?
- If I’ve been using this for 700 days, do we load 700 days?
- If the files keep changing, do we re-embed everything every time?

## The shape of an agent that actually remembers

One of the best mental models I’ve seen is to treat memory as **a small set of human-readable artifacts** that the agent can both read and maintain.

It usually looks like this:

```
.
├── AGENTS.md
├── memory.md
└── logs/
    ├── 2026-01-29.md
    ├── 2026-01-28.md
    └── ...
```

<BlogCallout title="Why I like this">
It’s not “AI magic”—it’s paperwork. The simplest thing that can work at scale is a paper trail.
</BlogCallout>

### `AGENTS.md` (the contract)

Think of `AGENTS.md` as the file that teaches the agent *how to be an agent in this repo*.

Here’s the kind of content that makes the rest of the system predictable:

```md
# AGENTS.md

## Operating principles
- You are an assistant with long-term memory.
- Prefer citing facts from `memory.md` over guessing.
- When information is uncertain, ask or mark as tentative.

## Files you can edit
- `logs/YYYY-MM-DD.md`: append-only daily log.
- `memory.md`: curated long-term memory; keep it short and factual.

## What counts as memory
Promote only durable facts:
- stable preferences (e.g. “prefers short answers”)
- ongoing projects + constraints
- canonical decisions (“we use sqlite-vec for embeddings”)
- important entities (names of internal tools, repo structure)

Do NOT promote:
- ephemeral chat details
- one-off experiments
- transient emotions

## End-of-day routine (compaction)
1. Summarize today’s log into 5–15 bullets.
2. Promote durable facts into `memory.md`.
3. Mark the daily log as compacted (keep the raw text).
```

That file alone changes the experience: the agent stops “sort of remembering” and starts behaving like it has a process.

### `logs/YYYY-MM-DD.md` (raw, chronological, noisy)

Daily logs are where reality lands. They’re allowed to be messy.

Example:

```md
# 2026-01-29

## What happened
- Investigated why Moltbot forgets long-running decisions across sessions.
- Found memory stored as Markdown files + embedding index.
- Noted recurring user preference: wants concise, information-dense answers.

## Decisions
- Keep blog posts in `src/content/blog/*.md` with frontmatter exports.
- Replace dummy posts with a single, real post.

## Open questions
- When do we compact logs into `memory.md`?
- How do we avoid duplicating similar memories?

## Candidate promotions
- User preference: concise, dense responses.
- System pattern: layered memory (recent logs + curated memory + retrieval).
```

This format is boring in the best way: it’s auditable, append-only, and easy to compact.

### `memory.md` (curated, sparse, durable)

Long-term memory should be **short** and **structured**. If it turns into a second log, it becomes useless.

Example:

```md
# memory.md

## Preferences
- Writing: concise, information-dense, minimal fluff.
- UI: content-first, quiet layouts; avoid heavy chrome.

## Current work
- Goal: improve Moltbot’s memory behavior + explain the system publicly.
- Blog: markdown-driven, compiled to Vue via unplugin-vue-markdown.

## Decisions / architecture
- Memory storage is file-based; recall uses an embedding index over fragments.
- Context is rebuilt every turn from a small working set + retrieved fragments.
```

This division matters: daily logs can grow without guilt; `memory.md` stays small enough to fit in context every time.

## How does this scale over time?

My naive picture at first was “everything gets loaded back in.” Hundreds of files, thousands of lines.

That clearly wouldn’t work.

What makes systems like this viable is a deliberately small working set:

- Very recent logs (often last 1–2 days).
- The curated `memory.md`.
- Everything else stays on disk, reachable indirectly via search.

Once you see it that way, memory stops being a blob and becomes layered:

- **near**: recent turns
- **medium**: today/yesterday’s log
- **far**: historical logs, only reachable through retrieval

## Files keep growing — do we re-embed everything?

If your logs are append-only, re-embedding entire files on every write is the fastest way to make the system collapse under its own weight.

The only approach that makes sense is incremental indexing: embed only what changed since last time.

Conceptually, it’s just diff + embed:

```ts
import { readFile } from 'node:fs/promises'
import { diffLines } from 'diff'

export async function embedDiffs(oldPath: string, newPath: string) {
  const oldText = await readFile(oldPath, 'utf8')
  const newText = await readFile(newPath, 'utf8')

  for (const part of diffLines(oldText, newText)) {
    if (!part.added) continue
    await indexMemoryFragment({
      file: newPath,
      text: part.value,
    })
  }
}
```

Seen this way, embeddings stop feeling magical. They’re just a secondary index built incrementally on top of text you already trust.

## How context is built (every single turn)

The interesting part happens right before the model produces a response.

At that moment, the system has to assemble context — not “all memory”, just what might matter now.

The pattern is simple:

- Take the current user input
- Embed it
- Similarity search over the memory index
- Retrieve a small number of relevant fragments
- Stitch those fragments into the prompt

In code, it often ends up looking like:

```ts
const memories = await recallMemory(userInput)

const systemPrompt = `
You are an assistant with long-term memory.

Relevant memory:
${memories.map((m) => `- ${m.content}`).join('\n')}
`.trim()

const response = await llm.chat({
  system: systemPrompt,
  user: userInput,
})
```

The hard part is not querying memory. The hard part is deciding:

- how often to recall
- how much to include
- what to do when retrieved fragments contradict each other
- how to keep old information from drowning out the present

## How memory gets indexed (the diagram I needed)

This is the picture that finally made the system feel concrete:

```
             ┌─────────────────────────┐
             │ user + tool outputs      │
             └────────────┬────────────┘
                          │
                          │ append
                          v
                 ┌─────────────────┐
                 │ logs/YYYY-MM-DD │
                 └───────┬─────────┘
                         │ chunk
                         v
                 ┌─────────────────┐
                 │ text fragments  │
                 └───────┬─────────┘
                         │ embed()
                         v
┌───────────────┐  upsert ┌──────────────────────────────┐
│ memory.md     │ ───────>│ vector index (sqlite-vec etc) │
└───────────────┘         │ {id, file, span, text, vec}   │
                          └────────────┬──────────────────┘
                                       │
                                       │ query: embed(input)
                                       v
                          ┌──────────────────────────────┐
                          │ top-k similar fragments       │
                          └────────────┬──────────────────┘
                                       │
                                       v
                          ┌──────────────────────────────┐
                          │ prompt context (rebuilt now)  │
                          └──────────────────────────────┘
```

If you only remember one thing: **context is rebuilt every time**. Memory lives outside the model. Retrieval is the bridge.

## Compaction (the thing that decides what survives)

Without compaction, file-based memory has a predictable failure mode:

- logs grow
- embeddings grow
- retrieval starts returning repetitive, overlapping fragments
- the model spends tokens re-reading history instead of doing work

Compaction is the periodic act of collapsing many small pieces into fewer, denser summaries. Details are intentionally lost, but structure remains.

### A concrete compaction flow

Here’s the compaction loop that makes the earlier file layout pay off:

1. **Summarize**: turn a day’s log into a short summary.
2. **Promote**: extract durable facts into `memory.md`.
3. **Deduplicate**: merge near-duplicates; keep one canonical wording.
4. **Mark compacted**: keep the raw log, but stop treating it as “hot”.

### Before: three days of raw logs

```md
# 2026-01-27
- User dislikes long introductions.
- We decided to store memory as Markdown files.
- Experimented with embedding whole files (slow).

# 2026-01-28
- User asked for “same tone and structure” when extending posts.
- We switched to diff-based embedding.
- Repeated: user prefers concise answers.

# 2026-01-29
- Added a new blog post.
- Repeated: memory is layered (recent + curated + retrieval).
```

### After: curated memory + compacted summaries

`memory.md` becomes:

```md
## Preferences
- Prefers concise, information-dense answers.
- Wants extensions to match the original tone and structure.

## Decisions / architecture
- Memory lives as Markdown files + retrieval via embedding index.
- Use incremental (diff-based) indexing, not full-file re-embedding.
- Context is rebuilt every turn using a small working set + top-k retrieval.
```

And the daily logs can be tagged as compacted, for example:

```md
## Compaction
- status: compacted
- promoted: Preferences, Decisions / architecture
- note: raw details preserved below
```

Compaction is also where “forgetting” becomes intentional: you decide that some details no longer deserve prime real-estate.

## Memory has a lifecycle

Around this point, I came across a breakdown by Manthan Gupta that put language to what I was seeing in practice.

What resonated with me is that memory isn’t a database you occasionally query. It’s something that moves through states:

- **short-term**: recent turns (cheap, noisy)
- **working**: distilled summaries used for reasoning
- **long-term**: sparse, curated facts that persist

The Moltbot split between daily logs and `memory.md` stopped looking arbitrary. It started to look like a pragmatic lifecycle:

- write everything down
- compact often
- keep the long-term file small enough to always load
- use retrieval as the “long tail” for the rest

## A short detour: why “supermemory” feels like the fix

I can’t say anything meaningful about closed-source internals.

But the *idea* that stood out to me is simple: recall shouldn’t happen sporadically. It should feel continuous—like the assistant is always lightly checking “what do I already know that matters here?”

In practice, that usually means:

- retrieval happens more often (not just when explicitly prompted)
- memory is re-ranked and re-written more aggressively
- compaction and promotion are first-class, not an afterthought

## Where this left me

I started this journey wondering whether Moltbot “remembered things properly”.

I ended it thinking less about correctness and more about flow:

- what gets written down
- what gets summarized
- what gets compacted
- what gets flushed
- what gets pulled back in for the next response

This didn’t give me a single right answer. But it gave me a much clearer way to think about agent memory — and that alone was worth the detour.

