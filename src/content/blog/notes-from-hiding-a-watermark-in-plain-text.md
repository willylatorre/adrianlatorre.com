---
title: Notes From Hiding A Watermark In Plain Text
date: 2026-08-17
description: I built a small playground to understand how an invisible text watermark can live inside ordinary word choices.
---

<script setup>
const samplerSnippet = `seed = hash(secret_key, recent_words)
candidates = model.next_word_choices()
next_word = keyed_sample(candidates, seed)`

const detectorSnippet = `evidence = score_choices(text, secret_key)
confidence = compare_with_random_chance(evidence)`
</script>

Anthropic recently published a post about [adding a text watermark to future Claude models](https://www.anthropic.com/news/claude-text-watermark). My first reaction was the obvious one: where is it? Image watermarks are easy to picture because they sit in a corner and make themselves known. Text has no corner. There is no badge attached to a paragraph, no extra file traveling beside it, and no zero-width character hiding between the words with a tiny Claude logo. You can copy the answer into a plain text editor and nothing new appears. The watermark is made from the words that were already going to be there.

That is a strange idea until you can touch it, which is usually my cue to build a small thing and make the confusion interactive. I wanted to see what would happen if a passage offered several perfectly normal words, a hidden rule favored some of them, and a reader started swapping them. Would the signal disappear after one edit? Would every seventh word become “submarine”? Would the detector develop the confidence of a weather app five minutes before rain? The real method is more careful than my demo, but the basic idea is simple enough to put on a page.

So I built an [interactive LLM watermark playground](/watermark). It uses an original story about a Jazz Age party near Saturn, a household AI announcing that it has a soul, and a toaster asking for peer review. The marked words can be changed without breaking the story. As you change them, the score moves. It is not Claude's detector and it cannot tell whether random text came from an LLM. It is a small model of the idea in Anthropic's post, built so the invisible part has something you can click.

## The words are the watermark

A language model writes one small piece at a time. At each step it has a list of possible next tokens, each with a different chance of being chosen. Sometimes the answer is boxed in. After “two plus two equals,” a model does not have much room to express itself unless it wants mathematics to file a complaint. In other places the choice is wide open. A party can be elegant, glittering, loud, or already regrettable. An announcement can be polite, formal, or grave. Several choices can be good, and choosing one instead of another does not change the point of the sentence.

Those ordinary choices give a watermark somewhere to live. Without a watermark, the model samples from its list in the usual way. With one, the sampling also depends on a secret key and the recent text. The key quietly favors some good options over other good options. It does not change the subject, add a hidden message after generation, or force the model to mention a teapot every ninth sentence. That last approach would be easy to detect, mostly because readers would stop inviting the model to meetings.

In very simplified pseudocode, the generation side looks like this:

<ProsePre
  language="python"
  :code="samplerSnippet"
>
  <ProseCode class="language-python">
{{ samplerSnippet }}
  </ProseCode>
</ProsePre>

The important part is that the chosen word still comes from the model's normal set of answers. The secret key only changes how the final choice is made. One favored word means almost nothing because normal writing can land on it by luck. A long answer contains many choices, though, and those small nudges can add up to a pattern. Someone with the same key can check whether the pattern appears more often than chance would suggest. It is less like finding a signature under the text and more like noticing that a coin has landed on heads an oddly large number of times.

## Building a version I could poke

For the playground, I wrote a short passage and marked nineteen places where three different words could fit. The first version chooses one word at each spot using a fixed demo key. The detector then scores those choices and compares the result with what it would expect from random picks. I made the starting passage a strong match on purpose; otherwise the first screen would introduce watermarking with the energy of a smoke alarm whose battery may or may not be low.

[Try changing a few words in the playground](/watermark). The number on the right updates immediately, along with the count of edited words and a plain label: strong match, possible match, or no clear signal. Reset puts the original choices back. The demo uses 80 percent for “Possible match” and 95 percent for “Strong match,” but those are teaching thresholds I picked for this page, not numbers taken from Anthropic's detector. The score means “this passage fits my little key,” not “there is a 92 percent chance an LLM wrote this.” That difference is not fine print. It is the difference between showing how a tool works and pretending the browser has become a courtroom expert.

The detector itself is deliberately small:

<ProsePre
  language="python"
  :code="detectorSnippet"
>
  <ProseCode class="language-python">
{{ detectorSnippet }}
  </ProseCode>
</ProsePre>

The real [SynthID-Text paper](https://www.nature.com/articles/s41586-024-08025-4) describes a more advanced system called Tournament sampling. It draws several possible tokens, lets them compete through keyed scoring rounds, and uses the winner. Detection looks back at the text and checks whether the chosen tokens score unusually well with that key. My version borrows the shape of that idea, then removes enough machinery that it can live in one small TypeScript file and still be explained before the reader needs coffee.

## Why one edit can travel

There is one wrinkle that made the experiment more interesting than a list of “good” and “bad” words: the recent text is part of the input to the key. A word is not permanently watermarked on its own. It can strengthen the pattern in one sentence and do very little in another because the words before it are different. When you replace one marked word, you change its score and may also change how the next choice is checked. The edit travels a short distance even though the later words on the screen have not moved.

I had to tune that behavior because my first attempt was far too dramatic. One harmless edit could take the passage from a strong match to no signal at all, which made the detector feel less like careful evidence and more like a cat reacting to a cucumber. The current version keeps a little context, but limits how far one change can spread. Every single-word replacement stays in the possible range, while several edits can pull the score down much further. That is closer to the lesson I wanted: a light edit weakens the pattern; it should not cause the entire instrument panel to leave the aircraft.

## More text gives the detector more chances

Short passages are hard to judge because they contain very few choices. If I flip a coin three times and get three heads, I have had a mildly notable morning. If I flip it three hundred times and get heads almost every time, the coin and I should have a conversation. A watermark detector has the same problem. It needs enough text to tell a real pattern from a lucky run, which is why Anthropic warns that short samples are harder to detect and why a one-line joke is not a useful test, no matter how strongly the joke sounds like something a robot would tell at lunch.

The kind of writing matters too. Creative prose gives a model plenty of reasonable options, so there are more places where the key can guide a choice. Facts, code, and proofreading jobs give it less room. Newton's book has a real title; a watermark should not rename it for the sake of a stronger score. Code must still compile, APIs still have names, and a proofreading request may leave most of the original writer's words untouched. The watermark can only appear where the model actually gets to choose. When the task offers fewer choices, the signal has less material to work with.

This is one reason a watermark should not be treated like a stamp that every answer carries at the same strength. Its visibility depends on how long the text is, how much freedom the model had, and how much of the final version came from the model at all. A detector that says “I do not have enough evidence” is not failing. It is showing better manners than a detector that turns four sentences into a confident accusation.

## Does the hidden rule make the writing worse?

The obvious worry is that steering word choices toward a secret pattern could make the answer sound odd. A watermark that reliably identifies AI text by making every paragraph worse would solve its own adoption problem very quickly. SynthID-Text is designed to keep choices close to the model's usual output while changing the sampling process. In the published evaluation, DeepMind compared watermarked and unwatermarked answers with automated tests, human ratings, and nearly 20 million live Gemini responses. The researchers reported no meaningful quality drop in that large production test.

That does not mean every watermark setting is free. The paper discusses tradeoffs between detection strength, variety, speed, and how closely the watermarked output matches the original distribution. Push too hard and quality can move; push too softly and the detector has less to find. The useful result is that a real system can leave a detectable pattern without adding awkward phrases or hiding characters after the answer is finished. To a reader, the best watermark should be boring. All of its personality belongs in the detector.

## What a match can and cannot say

Light editing can weaken a watermark while leaving enough of the original choices to detect. A heavy rewrite can replace the pattern completely. This is both a limit and a useful reminder of what the claim means. If a person rewrites every sentence, rearranges the argument, and adds their own examples, asking whether the final text is “AI written” has become a question about the writing process, not a fact that one score can settle. The detector sees the finished words. It does not see the afternoon that produced them.

A match means a generator using that key was probably involved. It does not prove who wrote the ideas, who owns the text, whether the model supplied one paragraph or ten, or whether a person carefully edited every line. It also does not identify output from other models. Anthropic's key can test for Anthropic's watermark; another provider may use a different key, a different method, or no watermark at all. Generic AI-writing classifiers try to guess from style and predictability, which is a different and much wider claim. A keyed detector asks a smaller question, and smaller questions are often where software behaves best.

Anthropic says it plans to offer a watermark detection API. When that is available, it will be interesting to test real examples: short answers, translations, copied sections, mixed human and model writing, and the heroic amount of editing required to make a generated company update sound as if a person has met another person. Until then, this playground stays honest about its limits. It explains the moving parts, uses its own key, and does not pretend to inspect arbitrary text.

## A clue, not a judge

Text watermarking will not solve every question about AI-written content. Keys can leak, text can be rewritten, short answers remain difficult, and not every model will use the same system. What it can offer is a useful clue that travels with the words without storing a central copy of every conversation or adding something visible to the page. That feels like a good building block as long as the product around it keeps the claim modest.

That was the reason for the experiment. Anthropic's post describes an invisible pattern, and invisible patterns are hard to build an intuition for by reading one more paragraph about invisible patterns. Letting the reader change “grave” to “polite” and watch the score move makes the idea less mysterious. Or, as the toaster in the demo might put it: the result looks promising, the sample could be larger, and someone should probably check whether the champagne fountain has passed peer review.
