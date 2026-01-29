---
title: Notes From Digging Into Moltbot’s AI Memory
date: 2026-01-29
description: A practical tour of agent memory files, indexing, and compaction.
---

I didn’t play with Moltbot.

I read a lot about it—especially the part everyone seemed to repeat: it *remembers everything*.

That’s what got me thinking about the unglamorous question behind most “agent memory” hype: where does memory actually live, and how does it get back into context?

So I did the least mystical thing possible: I opened the code.

Moltbot’s repo is here: [`moltbot/moltbot`](https://github.com/moltbot/moltbot). It’s an open-source personal assistant with a “workspace” on disk (Markdown files you can read/edit) plus a derived search index (so it can retrieve relevant fragments later).

Everything below is based on reading Moltbot’s repository + docs and following the memory trail.

## Starting from the simplest observation

In Moltbot, “memory” is not abstract. It’s tangible.

It’s files. On disk. Mostly Markdown.

Once that clicks, the questions become very practical:

- If memory is just files, what happens when there are a lot of them?
- If I’ve been doing this for 700 days, do we load 700 days?
- If files keep changing, do we re-index everything every time?

## What Moltbot’s memory layout looks like (from the repo)

Moltbot anchors long-term memory in an agent workspace (default is `~/clawd` in their docs). The core idea is: keep a few small “always read” files, and then a daily log you can grow forever.

The shape looks roughly like this:

```text
~/clawd/
├── AGENTS.md
├── SOUL.md
├── USER.md
├── memory.md        # (or MEMORY.md)
└── memory/
    ├── 2026-01-29.md
    ├── 2026-01-28.md
    └── ...
```

Two important clarifications that the repo makes explicit:

- The workspace is meant to be human-readable and versionable (git-friendly).
- “Continuity” lives in these files; the model itself is a fresh instance each session.

### `AGENTS.md` (the operating instructions)

In the default Moltbot setup, `AGENTS.md` is the instruction file that tells the agent how to behave and—critically—what to read/write as “memory”.

The default doc literally says: on session start, read `SOUL.md`, `USER.md`, `memory.md`, and today+yesterday in `memory/`.

### `memory/YYYY-MM-DD.md` (daily log, chronological, allowed to be messy)

These are the appendable daily files. They can be long. They can be noisy. They’re the raw material.

The reason this works is that “raw” and “useful-in-context” are treated as different things.

### `memory.md` (curated, sparse, durable)

This is the file you *want* to stay small. Durable facts, preferences, decisions—things worth paying token rent for every session.

The repo treats it as the compact “core-ish” layer: always available, never sprawling.

## How this scales over time (without loading 700 days)

My naive picture was: “memory means everything gets loaded back in.”

But Moltbot’s approach (and most sane approaches) is a deliberately small working set:

- `memory.md` (curated core)
- today + yesterday from `memory/` (fresh reality)
- everything else stays on disk, reachable indirectly via search

Seen this way, memory is layered:

- **near**: recent turns + today/yesterday
- **far**: older days, only reachable through retrieval

## How memory gets indexed (what I saw in the code)

Moltbot maintains a derived index so it can search memory without rereading piles of Markdown each time.

From the code path, you can see three practical details that make this viable:

- It watches the workspace (`memory/`, `MEMORY.md`/`memory.md`, and optional extra paths) and marks the index “dirty” on changes.
- It syncs incrementally (not “rebuild from scratch on every write”).
- It supports fast lexical search (SQLite FTS) and semantic/vector search, then merges results.

The mental model is still pleasantly boring:

```text
Markdown files (source of truth)
        |
        |  chunk + index (incremental sync)
        v
SQLite index (FTS + vectors + metadata)
        |
        |  query (input -> search)
        v
Top-k fragments + citations
```

If you only remember one thing: **context is rebuilt every time**. Memory lives outside the model. Retrieval is the bridge.

## “Do we re-embed everything?” (the part that would otherwise melt your laptop)

If your memory is append-heavy, re-indexing entire files on every change is the fastest way to make the system hate you back.

Moltbot avoids that by syncing changes incrementally and caching work in the index. The exact implementation details aren’t the point here—the point is the pattern: only process what changed, and keep the rest stable.

In simplified pseudo-code, the idea is basically:

```ts
// PSEUDO-CODE: incremental updates, not full rebuilds
async function syncIndex({ changedFiles }: { changedFiles: string[] }) {
  for (const file of changedFiles) {
    const chunks = chunkMarkdown(await readFile(file, 'utf8'))
    await upsertChunksIntoIndex({ file, chunks })
  }
}
```

## How context is built (every single turn)

Right before the model answers, the system has to assemble context—not “all memory”, just what might matter now.

The pattern (again: unromantic, effective) is:

- Take the current user input
- Search memory (lexical + semantic)
- Retrieve a small number of fragments
- Stitch them into the prompt with citations/structure

In broad strokes, it ends up looking like:

```ts
// PSEUDO-CODE: retrieve a small working set
const memories = await recallMemory(userInput, { k: 12 })

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

The hard part isn’t querying memory. It’s deciding:

- how often to recall
- how much to include
- what to do when retrieved fragments contradict each other
- how to keep old information from drowning out the present

## Compaction (what decides what survives)

Without compaction, file-based memory has a predictable failure mode:

- logs grow
- indexes grow
- retrieval starts returning repetitive, overlapping fragments
- the model spends tokens rereading history instead of doing work

Compaction is the periodic act of collapsing many small pieces into fewer, denser summaries. Details are intentionally lost, but structure remains.

### A concrete compaction flow

The loop that makes the file layout pay off looks like this:

1. **Summarize**: turn a day’s log into a short summary.
2. **Promote**: extract durable facts into `memory.md`.
3. **Deduplicate**: merge near-duplicates; keep one canonical wording.
4. **Mark compacted**: keep the raw day file, but stop treating it as “hot”.

### Before: three days of raw daily logs

```md
# 2026-01-27

- User dislikes long introductions.
- We decided to store memory as Markdown files.
- Experimented with full reindexing (slow).

# 2026-01-28

- Switched to incremental indexing.
- Repeated: user prefers concise answers.

# 2026-01-29

- Repeated: memory is layered (core + recent + retrieval).
```

### After: curated core memory

`memory.md` becomes:

```md
## Preferences

- Prefers concise, information-dense answers.
- Wants extensions to match the original tone and structure.

## Decisions / architecture

- Memory lives as Markdown files; recall uses a derived search index.
- Prefer incremental indexing over full rebuilds.
- Rebuild context every turn from a small working set + top-k retrieval.
```

Compaction is also where “forgetting” becomes intentional: you decide that some details no longer deserve prime real-estate.

## Memory has a lifecycle

Once you see the split (daily files vs `memory.md`), it stops looking arbitrary and starts looking like a lifecycle:

- write everything down
- compact often
- keep the core file small enough to always load
- use retrieval as the “long tail” for the rest

It’s not glamorous, but it’s legible—and that’s the whole point.

## Where this left me

I started this by being curious about a claim (“it remembers everything”).

I ended it with a clearer mental model:

- memory is files you can read
- recall is an index you can rebuild
- “remembering” is mostly compaction + retrieval policy

That didn’t hand me a single right answer, but it did remove a lot of fog.

One last note: if you want a more “continuous recall” feel, [supermemory.ai](https://supermemory.ai) has a plugin that aims to help with exactly that—worth a look as an add-on approach.
