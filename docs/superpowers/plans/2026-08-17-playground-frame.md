# Playground Frame Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give all five Playground routes one shared notebook-style header and footer, document the convention, and remove the nested surface from labelled blog code snippets.

**Architecture:** Add two focused Vue components under `src/components/experiment/` and keep experiment-specific content in each page. Use source-contract Vitest tests to lock down component semantics, safe link behavior, and adoption by every scoped route; keep the blog snippet correction local to `ProsePre.vue`.

**Tech Stack:** Vue 3, TypeScript, Vue Router, Nuxt UI, scoped CSS, Vitest

## Global Constraints

- Scope is limited to `/orchestrator`, `/ai-chat`, `/tiptap-llm`, `/watermark`, and `/vue-go`; Media remains unchanged.
- Each Playground route has one shared header, one page-level `h1`, a purpose-built body, and one shared footer.
- Headers contain the fixed `Playground` eyebrow, title, and concise introduction only.
- Footers contain `What I learned`, `Notes & links`, a concrete conclusion, and at least one useful link.
- Use existing warm site tokens and Nuxt UI foundations; add no dependencies.
- Custom `ProsePre` snippets render one component-owned surface, while ordinary fenced Markdown blocks retain their page-level styling.

---

### Task 1: Shared experiment frame contracts

**Files:**
- Create: `src/components/experiment/experimentFrame.test.ts`
- Create: `src/components/experiment/ExperimentHeader.vue`
- Create: `src/components/experiment/ExperimentFooter.vue`

**Interfaces:**
- Produces: `ExperimentHeader` props `{ title: string; description: string }`
- Produces: exported `ExperimentLink` type `{ label: string; href: string; external?: boolean }`
- Produces: `ExperimentFooter` props `{ conclusion: string; links: ExperimentLink[] }`

- [ ] **Step 1: Write the failing shared-component source-contract tests**

Create a Vitest file that reads each component source when present and otherwise returns an empty string. Assert that the header owns the fixed `Playground` eyebrow, one `<h1>`, and title/description props. Assert that the footer owns the two required headings, renders internal destinations with `RouterLink`, and renders external destinations with `_blank`, `noopener noreferrer`, and a decorative external-link icon.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/components/experiment/experimentFrame.test.ts`

Expected: FAIL because both component sources are missing and therefore do not satisfy the required source contracts.

- [ ] **Step 3: Implement the minimal shared components**

Create a semantic `<header>` with a fixed eyebrow, bound title and description, and scoped notebook-style typography. Create a semantic `<footer>` with a bordered two-column desktop layout, stacked mobile layout, conclusion copy, and internal/external link branches. External icons use `aria-hidden="true"`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- src/components/experiment/experimentFrame.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/experiment
git commit -m "feat: add shared playground frame"
```

### Task 2: Adopt the frame across every Playground route

**Files:**
- Modify: `src/components/experiment/experimentFrame.test.ts`
- Modify: `src/pages/AgentOrchestratorPage.vue`
- Modify: `src/pages/AIChatPage.vue`
- Modify: `src/pages/TiptapPlaygroundPage.vue`
- Modify: `src/pages/WatermarkPlaygroundPage.vue`
- Modify: `src/pages/VueGoPage.vue`

**Interfaces:**
- Consumes: `ExperimentHeader` and `ExperimentFooter` from Task 1
- Produces: one consistent framing contract on all five route components

- [ ] **Step 1: Add the failing page-adoption contract**

Extend the test to read all five page sources and assert each imports and renders `ExperimentHeader` and `ExperimentFooter` exactly once, retains exactly one literal `<h1>` through the shared component rather than page-local markup, and no longer uses experiment numbering.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/components/experiment/experimentFrame.test.ts`

Expected: FAIL because none of the pages yet render both shared components.

- [ ] **Step 3: Migrate Agent Orchestrator**

Use title `Agent Orchestrator`, a concise explanation of visible routing/tool events, a conclusion about the explicit event contract, and links to the repository and OpenAI function-calling documentation.

- [ ] **Step 4: Migrate AI Interview**

Use title `AI Interview`, a concise explanation of streamed answers and generated pixel art, and replace the takeaway-card ending with a conclusion about the stable message-part shape plus repository and OpenAI SDK links.

- [ ] **Step 5: Migrate Tiptap + LLMs**

Use title `Tiptap + LLMs`, keep the interactive editor sections, replace the ad hoc Summary ending with the shared conclusion about constrained output and document synchronization, and link to the repository and Tiptap documentation.

- [ ] **Step 6: Migrate the watermark experiment**

Replace the numbered/badged local hero and custom link row with the shared components. Preserve the reading desk and explainer, and keep the build notes, Anthropic announcement, and SynthID-Text paper in the shared footer.

- [ ] **Step 7: Migrate Vue + FastAPI**

Use title `Vue + FastAPI`, remove the duplicated source/fork alerts, retain the technical walkthrough and live demo, and conclude with the typed-contract/single-deployment lesson plus repository and FastAPI links.

- [ ] **Step 8: Run the focused test and verify GREEN**

Run: `npm test -- src/components/experiment/experimentFrame.test.ts`

Expected: PASS for both component and five-page adoption contracts.

- [ ] **Step 9: Commit**

```bash
git add src/components/experiment/experimentFrame.test.ts src/pages
git commit -m "feat: unify playground page framing"
```

### Task 3: Remove the nested blog snippet surface

**Files:**
- Create: `src/components/prose/ProsePre.test.ts`
- Modify: `src/components/prose/ProsePre.vue`

**Interfaces:**
- Produces: `ProsePre` inner `<pre>` styles with zero margin, zero border, transparent background, and component-owned padding/overflow

- [ ] **Step 1: Write the failing snippet regression test**

Read `ProsePre.vue` and assert its inner `pre` rule explicitly contains `margin: 0`, `border: 0`, and `background: transparent`, while `.prose-pre` retains the outer border and background.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/components/prose/ProsePre.test.ts`

Expected: FAIL because the inner `pre` currently inherits the blog page's border, margin, and background.

- [ ] **Step 3: Implement the scoped reset**

Change the inner rule to `.prose-pre > pre` and explicitly set `margin: 0`, `border: 0`, `background: transparent`, while retaining overflow and padding.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- src/components/prose/ProsePre.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/prose/ProsePre.vue src/components/prose/ProsePre.test.ts
git commit -m "fix: remove nested code snippet surface"
```

### Task 4: Document and verify the convention

**Files:**
- Modify: `PRODUCT.md`

**Interfaces:**
- Produces: durable `Playground Experiment Anatomy` guidance for future routes

- [ ] **Step 1: Add the product rule**

Document the five scoped routes, shared component names, required content order, one-`h1` rule, conclusion/link requirements, body flexibility, navigation requirement, and accessibility expectations.

- [ ] **Step 2: Run complete automated verification**

Run:

```bash
npm test
npm run type-check
npm run lint
npm run build
git diff --check
```

Expected: every command exits 0. Review and preserve any formatter-only changes made by the lint scripts only when they are within the task scope.

- [ ] **Step 3: Run visual verification**

Start the client and inspect all five Playground routes at desktop and mobile widths. Confirm consistent header/footer hierarchy, no horizontal overflow, visible focus states, retained experiment bodies, and no double surface on a labelled blog snippet. Also inspect one fenced Markdown block to confirm its existing standalone styling remains.

- [ ] **Step 4: Commit**

```bash
git add PRODUCT.md
git commit -m "docs: define playground experiment anatomy"
```

- [ ] **Step 5: Push**

```bash
git push -u origin codex/playground-frame
```
