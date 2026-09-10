# Hashi Article Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the thin Hashi build note with a funny, step-by-step explanation of the puzzle logic using approachable pseudocode.

**Architecture:** Keep the existing Markdown route, frontmatter contract, and site prose components. Rewrite the article as a chronological build diary whose snippets explain when each rule is checked; preserve the existing metadata export test and add no feature code.

**Tech Stack:** Vue-flavored Markdown, `ProsePre`, Vitest, Vite.

## Global Constraints

- Match the conversational, first-person tone and technical depth of the existing site articles.
- Use clean pseudocode rather than production TypeScript.
- Keep all UI reasoning in one compact section.
- Do not discuss the leaderboard.
- Do not add a philosophical conclusion; finish with “Have fun.”

---

### Task 1: Rewrite and verify the Hashi article

**Files:**
- Modify: `src/content/blog/notes-from-building-hashi-one-rule-at-a-time.md`
- Verify: `src/content/blog/frontmatter-exports.test.ts`

**Interfaces:**
- Consumes: the existing Markdown frontmatter export convention and `ProsePre`/`ProseCode` components.
- Produces: the existing `/blog/notes-from-building-hashi-one-rule-at-a-time` article with unchanged title, date, and description.

- [ ] **Step 1: Preserve the existing metadata regression test**

Confirm that `src/content/blog/frontmatter-exports.test.ts` imports the Hashi article and asserts its exported title and date. No additional test is needed because the rewrite intentionally preserves this public contract.

- [ ] **Step 2: Replace the article body and add snippet constants**

Add a `<script setup>` block containing short pseudocode strings named:

```js
visibleCorridorsSnippet
cycleBridgeSnippet
crossingSnippet
islandStatusSnippet
connectivitySnippet
generatorSnippet
uniquenessSnippet
svgSnippet
```

Then rewrite the prose in chronological order:

1. Start from the urge to rebuild a puzzle that looks simpler than it is.
2. Compute only nearest visible neighbors before interaction.
3. Treat each corridor as the three-state cycle `0 → 1 → 2 → 0`.
4. Reject a proposed active bridge if its segment crosses another active bridge.
5. Recompute incident totals after every accepted move; use exact and overfilled states for immediate feedback.
6. When all totals match, traverse active bridges and require every island to be reachable; use the isolated `1—1` pair as the memorable counterexample.
7. Generate the solved non-crossing network first, derive clues, then accept a puzzle only when a bounded solver finds exactly one solution.
8. Explain one SVG coordinate system, edge-terminated bridge endpoints, and transparent wider click strokes.
9. Compress responsive width, opacity, persistence, and background-worker generation into one UI section.
10. End with the exact sentence `Have fun.`

Render every snippet through the established article pattern:

```vue
<ProsePre language="text" :code="visibleCorridorsSnippet">
  <ProseCode class="language-text">
{{ visibleCorridorsSnippet }}
  </ProseCode>
</ProsePre>
```

- [ ] **Step 3: Run focused verification**

Run: `npm test -- src/content/blog/frontmatter-exports.test.ts`

Expected: both root and worktree-discovered frontmatter suites pass, including the Hashi metadata assertion.

- [ ] **Step 4: Run production verification**

Run: `npm run type-check && npm run build`

Expected: both commands exit successfully; existing dependency annotation and chunk-size warnings are acceptable.

- [ ] **Step 5: Review tone and scope**

Read the rendered-source article once against the two reference posts. Confirm that every technical section explains both the rule and when it runs, jokes are sparse and contextual, leaderboard language is absent, the UI remains one section, and the final line is exactly `Have fun.`

- [ ] **Step 6: Commit**

```bash
git add src/content/blog/notes-from-building-hashi-one-rule-at-a-time.md
git commit -m "docs: expand hashi build notes"
```
