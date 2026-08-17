# Text Watermark Playground and Blog Post Design

## Goal

Create a new interactive playground and companion blog post about Anthropic's August 2026 text-watermark announcement. The playground should make keyed, statistical text watermarking understandable by letting visitors swap plausible words in an original literary passage and watch the simulated watermark evidence weaken or recover.

The finished work should feel like a polished experiment inside Adrian's existing portfolio, not a generic AI detector or a claim that the site can identify arbitrary model output.

## Source Material and Accuracy Boundary

The implementation is informed by:

- Anthropic's announcement, “How Claude's text watermark works”: <https://www.anthropic.com/news/claude-text-watermark>
- The SynthID-Text paper, “Scalable watermarking for identifying large language model outputs”: <https://www.nature.com/articles/s41586-024-08025-4>

Anthropic's production key is private and its detection API is not yet available. The playground therefore implements an explicitly labeled educational simulation inspired by the public design principles, not Claude's detector.

The UI must not say that a score is the probability that Claude, an LLM, or a human wrote the passage. It may say:

- “Watermark confidence: 72%”
- “This passage matches the playground's simulated watermark pattern.”
- “No clear signal,” “Possible match,” or “Strong match”

The simulation should reinforce the following real properties:

- A watermark is a statistical pattern in token choices, not hidden text or metadata.
- A key and recent context influence which otherwise plausible choice is favored.
- Longer, higher-entropy passages carry more evidence than short or constrained text.
- Editing some words weakens evidence gradually; a complete rewrite can remove it.
- A watermark indicates likely involvement by a keyed generator, not authorship, ownership, or arbitrary AI generation.

## Audience and Desired Experience

The primary audience is product-minded engineers and technically curious readers arriving from Adrian's blog or portfolio navigation. They should understand the central mechanism within one minute without needing prior knowledge of token sampling, probability distributions, or SynthID.

The experience should feel like editing a literary artifact. The passage is the visual hero, while the scoring explanation stays quiet and precise. The tone is technically grounded with one restrained joke running through the original prose.

## Chosen Direction: Reading Desk

The playground lives at `/watermark` and is discoverable under the existing Playground navigation.

At the top, a compact page header introduces the experiment and labels it an educational simulation. The main surface uses a responsive two-column Reading Desk:

- The left column contains an original 180–250-word passage combining Jazz Age party decadence with a deadpan household AI aboard a spacecraft.
- Approximately 16–20 carefully chosen word slots appear as subtle inline controls.
- Selecting a marked word opens a Nuxt UI `UPopover` with two to four semantically plausible alternatives.
- The right column contains the confidence number, `UProgress`, verdict `UBadge`, the number of changed choices, and a reset `UButton`.
- On mobile, the confidence panel moves above the passage and becomes compact.

Below the desk, a collapsible explanation walks through the simplified mechanism. A Nuxt UI `UAlert` states that the score is a local simulation and does not detect Claude or arbitrary AI text.

The visual treatment follows the site's warm-neutral design tokens, quiet borders, restrained green accent, system sans interface typography, and serif passage typography already used on blog pages. Motion is limited to short color and progress transitions. Important state is expressed with text as well as color.

## Interaction Model

Each marked slot contains a selected alternative and two to four replacements. All alternatives must remain grammatical and preserve the passage's meaning closely enough that the visitor experiences the choice as low stakes.

Selecting an alternative:

1. Updates the passage immediately.
2. Recalculates the simulated evidence using the same local key.
3. Animates the confidence meter with a restrained transition.
4. Updates the verdict and changed-choice count.
5. Closes the popover and returns focus safely.

Reset restores the generated baseline selections. There is no free-form text editing, backend call, user persistence, or external API in version one.

## Simulation Model

The simulation is deterministic, client-side, and separated from the Vue presentation layer.

### Passage data

`src/data/watermarkPassage.ts` defines the passage as a sequence of fixed text segments and choice slots. Each slot has a stable ID, a default alternative, and an array of equally plausible alternatives.

### Keyed scoring

`src/utils/watermarkSimulation.ts` implements a small deterministic keyed scoring function. For each slot and candidate alternative, it hashes:

- a fixed playground demo key;
- the stable slot ID;
- a short representation of preceding simulated context;
- the candidate ID.

The hash yields several binary watermark observations. The default passage chooses the strongest suitable candidate for each slot. User-selected alternatives may align more or less strongly with the key.

This mirrors the public idea that a key and recent context influence sampling while remaining intentionally simpler than SynthID-Text's Tournament sampling.

### Confidence calculation

The detector aggregates the binary observations for all selected choices and compares the observed aligned-bit count with a 50/50 null model. A one-sided binomial tail produces a local evidence value, displayed as `round((1 - pValue) * 100)`.

Verdicts are:

- below 80: **No clear signal**
- 80–94: **Possible match**
- 95 and above: **Strong match**

The exact thresholds belong to this educational demo and are described as such. The implementation returns a structured result containing confidence, verdict, aligned observations, total observations, and changed-slot count.

## Component Boundaries

- `src/pages/WatermarkPlaygroundPage.vue` owns selected choices, computes the current result, and composes the page.
- `src/components/watermark/WatermarkPassage.vue` renders the passage and emits a slot selection change.
- `src/components/watermark/WatermarkConfidence.vue` renders the score, progress, verdict, changed count, and reset action.
- `src/data/watermarkPassage.ts` owns passage content and slot alternatives.
- `src/utils/watermarkSimulation.ts` owns hashing, scoring, binomial evidence, and verdict selection.

The utility and data layers must not import Vue. The display components receive typed props and expose narrow events, so the scoring logic can be tested without rendering the UI.

## Blog Post

Add `src/content/blog/notes-from-hiding-a-watermark-in-plain-text.md` with publication date `2026-08-17`.

Title: **Notes From Hiding A Watermark In Plain Text**

The article should be approximately 1,200–1,700 words and use the direct, reflective, lightly playful voice of the existing Notes posts. Its narrative structure is:

1. Open with the surprising fact that a text watermark contains no hidden characters.
2. Explain next-token choice and low-stakes alternatives in plain language.
3. Explain how a key changes the source of randomness and leaves a statistical pattern.
4. Link prominently to the interactive playground.
5. Describe what happens when the reader swaps words and why confidence changes.
6. Explain the importance of passage length and entropy, including factual text, proofreading, and code as weaker carriers.
7. Distinguish watermark detection from generic AI-writing classifiers.
8. Cover limitations: edits, rewrites, private keys, false confidence on short samples, and involvement versus authorship.
9. Conclude that watermarking is useful provenance evidence, not a magical authorship oracle.

The article includes one compact simplified pseudocode snippet for keyed candidate selection and one for detection. It must cite Anthropic's announcement and the Nature paper directly and clearly label the playground as a simulation.

## Site Integration

- Add a lazy `/watermark` route named `Text Watermark`.
- Add `Text Watermark` under Playground in the sidebar and command-palette search group.
- Use a Lucide fingerprint, scan-text, or waves icon already available through Nuxt UI.
- The blog post is discovered automatically through the existing Markdown glob and appears in the sidebar and blog list.
- The article links to `/watermark`; the playground links back to the article once its slug is known.

## Accessibility and Responsive Behavior

- Each choice is a real button with an accessible name that includes the selected word and purpose.
- Popover alternatives support keyboard navigation through Nuxt UI primitives.
- Focus, hover, selected, and changed states remain distinguishable without color alone.
- The confidence verdict is live text but should not announce every intermediate visual transition aggressively; use a polite status region.
- The passage maintains a readable line length and at least 1.7 line height.
- Mobile uses a single-column layout with sufficiently large inline targets and no horizontal scrolling.
- Reduced-motion preferences disable or minimize score transitions.

## Error and Edge Handling

The playground has no network dependency. Invalid or missing selection IDs fall back to the slot's default choice rather than throwing during render. The scoring utility clamps numeric output to `0–100` and handles an empty slot list as no evidence. Reset is disabled when no choices have changed.

If a popover candidate would create broken punctuation or spacing, that is a passage-data defect caught by content review rather than repaired dynamically.

## Testing and Verification

Unit tests for `watermarkSimulation.ts` must verify:

- deterministic results for the same key and selections;
- confidence remains in the `0–100` range;
- the baseline passage produces a strong match;
- replacing several marked choices weakens confidence;
- resetting selections restores the baseline result;
- empty and invalid selections are handled safely;
- verdict thresholds map correctly.

Existing frontmatter tests should cover the new post. Verification also includes:

- the complete Vitest suite;
- Vue TypeScript checking;
- production build;
- desktop visual inspection of the Reading Desk, popovers, reset state, and article link;
- mobile-width inspection for stacking, readable passage controls, and absence of overflow;
- keyboard interaction and visible focus checks;
- rendered blog inspection for heading rhythm, code overflow, links, and voice consistency;
- confirmation that unrelated working-tree changes remain untouched.

## Non-Goals

- Calling Anthropic's future detector API.
- Detecting whether arbitrary text was written by an LLM.
- Reproducing Anthropic's private key or production implementation.
- Free-form text editing or user-provided text analysis.
- Persisting sessions or collecting analytics.
- Implementing C2PA credentials for image or file outputs.
