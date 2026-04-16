---
title: Notes From Trying To Use Chat As The Default UI For AI
date: 2026-04-16
description: Why chat feels magical at first, then expensive, and where structured UI tends to win.
---

<script setup>
const requestSnippet = `<request>{
  "query": "show me the experiments created in the last three months order by date (ascending)",
  "source": "xxx",
  "intent": "update"
}</request>`

const responseSnippet = `<response>{
  "query": {
    "$range": {
      "field": "createdAt",
      "from": "2026-01-16T14:55:56Z",
      "to": "2026-04-16T14:55:56Z"
    }
  },
  "sort": {
    "createdAt": "asc"
  },
  "explanation": "Experiments created in the last three months, sorted by creation date ascending"
}</response>`

const promptSnippet = `### Active Filter Context (Mode: Update)

The search UI currently has the following filters applied:

~~~json
{filters_json}
~~~

The user wants to **refine or modify** the current search.

**Important**: The search UI combines two kinds of filters:
- **UI filters** — set by the user via filter widgets. NOT your responsibility.
- **AI filter (\`$ai\`)** — YOUR output. Your query replaces the current \`$ai\` value.

Your task:
- Review the active filters to understand what is already being filtered.
- Do NOT regenerate conditions that the UI filters already cover.
- Your output must be the new value for the \`$ai\` filter.
- If the user modifies an existing condition, produce the complete updated query.`
</script>

I have been thinking a lot about how quickly we all reached for chat as the default interface for AI features.

It makes total sense at first. One input box, one model, infinite possibility. Product roadmap solved before lunch. It feels like the Swiss Army knife version of UI design: if everything is text, everything is possible.

Then reality shows up with receipts.

What looks flexible on the product side becomes work on the user side. Instead of clicking familiar controls, people have to guess what the system can do, phrase it in the right way, and retry when the first prompt misses. It is powerful, but it is also like asking someone to write a mini spec every time they want to sort a table.

Most people do not open software hoping for infinite freedom. They open it hoping to finish the task they already had in mind. They want the “this button does the thing” energy, not an improv workshop with a language model.

That is where chat can feel weirdly expensive. Not financially expensive. Attention expensive. It quietly shifts cognitive load from interface design to human effort.

I still like chat. A lot. It is amazing as an escape hatch when the UI is too rigid, as a power-user tool when you know what you want, and as an exploration mode when you are still poking around the edges. But for repeatable workflows, I keep seeing the same result: structured UI with small AI assists usually beats chat-first.

The pattern that has worked best for me is to keep the existing workflow and let AI translate intent into the system’s native structure.

So instead of “replace everything with a chatbot,” the flow becomes: user writes natural language, model converts that into filter JSON, UI applies it, and the app runs the same search flow users already trust. AI adds leverage without changing the muscle memory.

Example request:

<ProsePre
  language="json"
  :code="requestSnippet"
>
  <ProseCode class="language-json">
{{ requestSnippet }}
  </ProseCode>
</ProsePre>

Example response:

<ProsePre
  language="json"
  :code="responseSnippet"
>
  <ProseCode class="language-json">
{{ responseSnippet }}
  </ProseCode>
</ProsePre>

What I like about this approach is how boring it feels in production, in the best possible way. The user still recognizes the product. Filters look like filters. Sorting looks like sorting. You are not teleporting them into a chat universe just because an LLM exists.

And you can improve it incrementally. Add context about currently active filters, make the model update only the `$ai` fragment, keep explicit widget filters owned by the UI, and keep tightening behavior over time.

<ProsePre
  language="md"
  :code="promptSnippet"
>
  <ProseCode class="language-md">
{{ promptSnippet }}
  </ProseCode>
</ProsePre>

This split of responsibilities has been surprisingly healthy: the UI does deterministic things, AI does interpretation, and users stay in a flow they already understand.

So my current take is less “chat everywhere” and more “chat where it earns its keep.”

Use chat when people need to go off-road. For the daily commute, paved roads still win.

Or in less polite terms: not every product needs to become Slack plus vibes.
