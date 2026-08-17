---
title: Notes From Hiding A Watermark In Plain Text
date: 2026-08-17
description: What changes when an AI leaves a statistical signature in ordinary word choices, and what that signature can actually prove.
---

<script setup>
const samplerSnippet = `seed = hash(secret_key, recent_words)
candidates = model.next_word_choices()
next_word = keyed_sample(candidates, seed)`

const detectorSnippet = `evidence = score_choices(text, secret_key)
confidence = compare_with_random_chance(evidence)`
</script>

The first surprise about Anthropic's new text watermark is how little there is to see.

There is no badge attached to the answer. There are no zero-width characters hiding between the words. Copying the text into a plain text editor does not reveal a tiny Claude signature wearing sunglasses. The watermark lives in ordinary choices that the model was already going to make.

That makes it a much more interesting engineering idea than the word “watermark” suggests. A visible watermark says, “this image came from here.” A statistical text watermark says something closer to, “these hundreds of small decisions fit a pattern that would be unlikely to happen by chance.”

[Anthropic announced that future Claude models will use a version of SynthID-Text](https://www.anthropic.com/news/claude-text-watermark), the technique Google DeepMind published in 2024. Anthropic is making the change as part of its EU AI Act transparency commitments. The regulatory reason matters, but the mechanism is the fun part.

So I built a small experiment to make that mechanism tangible.

## A model has to pick something

A language model writes from left to right. At each step it calculates a distribution over possible next tokens, then chooses one. Sometimes that choice is effectively fixed. After “two plus two equals,” the model does not have much artistic room if it wants to remain invited to mathematics.

Other moments are loose. A party can be elegant, glittering, or extravagant. An announcement can be polite, formal, or grave. Several choices can fit the sentence while preserving its meaning and quality.

Those low-stakes moments are where a watermark can live.

Without watermarking, a random sampler helps select among the plausible candidates. With watermarking, the candidates still come from the model's normal distribution, but the random decision also depends on a secret key and the recent context.

In deliberately simplified pseudocode, the generation side looks like this:

<ProsePre
  language="python"
  :code="samplerSnippet"
>
  <ProseCode class="language-python">
{{ samplerSnippet }}
  </ProseCode>
</ProsePre>

The key changes the source of randomness, not the subject of the answer. It does not force the model to discuss submarines every seventh paragraph or develop a suspicious attachment to the word “quietly.” It nudges many acceptable choices into a pattern that someone holding the same key can test later.

One word proves almost nothing. Hundreds of choices begin to look less accidental.

## The reading desk

I wanted the idea to feel less like a probability lecture and more like touching the mechanism. The result is an original story about a Jazz Age party aboard a mansion-sized spacecraft, a household intelligence announcing it has developed a soul, and a toaster requesting peer review. Software deserves colleagues who keep it humble.

[Try the interactive watermark playground](/watermark).

The passage contains marked words with equally plausible alternatives. Click one, choose a replacement, and the watermark confidence changes. Edit enough of them and a strong match becomes a possible match, then no clear signal. Reset the passage and the original keyed pattern returns.

The demo uses its own fixed key and a much smaller scoring scheme than Anthropic's production system. Each candidate word receives a few deterministic observations derived from the key, its position, and the choices that came before it. The generated baseline picks strong candidates. The detector adds the observations and compares the total with what random chance would normally produce.

Conceptually, the detection side is small:

<ProsePre
  language="python"
  :code="detectorSnippet"
>
  <ProseCode class="language-python">
{{ detectorSnippet }}
  </ProseCode>
</ProsePre>

The number in the experiment is labeled “watermark confidence,” not “probability an LLM wrote this.” That distinction is doing real work. The demo can only test whether the passage matches its own simulated key. Anthropic's detector will test for Anthropic's key. Another provider may use another key, another technique, or no watermark at all.

This is provenance evidence, not a universal AI-writing test.

## Context makes one edit travel

There is a lovely wrinkle in using recent words as part of the seed. Changing one choice can alter how later choices are evaluated, even when those later words stay visible and untouched.

Imagine the key is a private book of directions. At each intersection, the model checks the last few turns and uses them to find the next instruction. Change one turn and the page lookup changes. The route after that point may still look perfectly sensible, but it no longer follows the same private sequence.

This is why the playground sometimes moves more than you might expect after a single edit. It is also why the marked words are not permanently “good” or “bad.” A word that strengthens the signal in one sentence may do nothing in another because the preceding context is different.

The public [SynthID-Text paper](https://www.nature.com/articles/s41586-024-08025-4) describes a more sophisticated version built around Tournament sampling. It samples several candidates from the model distribution and lets them compete across scoring layers. The winner becomes the next token. Detection then measures whether the resulting sequence scores unusually well against the keyed functions.

The important property is that acceptable model choices carry the signal. The detector does not need the original prompt, a database containing every answer, or access to the full language model. It needs the text, the scoring method, and the key.

## Long text is not an implementation detail

Short passages are where confidence should become humility.

A detector needs enough decisions to distinguish a real pattern from luck. If I flip a coin three times and get three heads, I have an interesting afternoon, not proof of a conspiracy. If I flip it three hundred times and get heads almost every time, the coin deserves an investigation.

Text watermarking has the same accumulation problem. A one-line joke contains few choices. A long explanation contains many. Anthropic explicitly notes that small samples are difficult to detect and that confidence grows with passage length.

The kind of text matters too. Creative prose has plenty of entropy, meaning the model has several reasonable next moves. Factual passages can be more constrained. Isaac Newton's famous work has a particular title. A detector cannot demand a different final word just to improve its score without turning provenance into misinformation, which would be a fairly ambitious product regression.

Code has similar limits. Variable names and comments offer some flexibility, but syntax, APIs, and expected outputs often do not. Proofreading can also leave a weak signal because most of the words still belong to the original author. A watermark only has room to appear where the model actually chooses something.

This is a useful product lesson: detectability is not one fixed model capability. It depends on length, entropy, task, sampling settings, and how much of the final text the model controlled.

## Does the watermark make writing worse?

The obvious fear is that steering choices toward a hidden pattern might make the output stranger. A watermark that reliably identifies AI text by making every paragraph worse would be technically detectable and commercially self-correcting.

SynthID-Text is designed to preserve the model's output distribution while changing how candidates are sampled. In the published evaluation, DeepMind compared watermarked and unwatermarked responses across automated benchmarks, controlled human ratings, and nearly 20 million live Gemini responses. The researchers reported no statistically significant quality difference in the large production experiment.

That does not mean every possible watermark configuration is free. The paper describes a tradeoff between detectability, diversity, computational behavior, and stronger notions of distribution preservation. It does show that a production system can carry a useful signal without inserting awkward phrases or hidden characters after generation.

The best watermark is boring to the reader. Its entire job is to become interesting to a detector.

## Editing is both an attack and a definition problem

Can someone remove the watermark? Yes, eventually.

Light edits may weaken the evidence without destroying it because most keyed choices remain. A heavy rewrite replaces those choices and can remove the pattern. That is a practical limitation, but it also raises a philosophical question hiding inside an engineering one: after every sentence has been rewritten by a person, what exactly would “AI-generated text” still mean?

The useful middle is content that has been copied, lightly edited, combined with human writing, or processed by a model. A detector can provide evidence that a keyed generator was involved somewhere in that history. It cannot reconstruct the entire writing process from a final paragraph.

A match means a keyed generator was probably involved; it does not settle authorship. It says nothing about ownership, intent, whether the model supplied one paragraph or ten, or whether a person carefully shaped every idea before asking for a rewrite.

## This is not the usual AI detector

Generic AI-writing classifiers look for patterns associated with model prose. They may study predictability, sentence structure, vocabulary, or stylistic habits. Those systems do not have the provider's private watermark key, so they are solving a different problem.

That distinction matters because style classifiers can mistake polished, formulaic, translated, or non-native writing for AI output. They also need recalibration as models and writing habits change. A keyed watermark instead asks a narrower question: does this sequence match the statistical pattern produced by this generation process?

Narrower is often healthier. The answer carries less drama, but its claim is easier to state precisely.

Anthropic says it plans to offer a watermark detection API. When that arrives, it will make sense to connect experiments to the real detector and see how length, editing, translation, and mixed authorship behave in practice. Until then, the local playground stays deliberately honest about its boundary. It teaches the mechanism. It does not cosplay as forensic evidence.

## A signal, not an oracle

Text watermarking will not solve every provenance problem. Keys can leak. Text can be rewritten. Short and constrained outputs remain difficult. Different providers may implement different systems, and unwatermarked models will still exist.

But the idea has a quality I like: it gives the generator a way to leave evidence without keeping a central archive of everyone's conversations and without making the output visibly worse. The pattern travels with the words, yet reveals no user, organization, or chat identity.

That is a useful primitive when the claim stays small. A watermark can say that a particular keyed system was probably involved. The surrounding product, policy, and human judgment still have to decide what that involvement means.

Or, in the language of the toaster: promising result, methodology acceptable, conclusions should be revised downward.
