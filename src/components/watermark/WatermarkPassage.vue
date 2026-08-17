<script setup lang="ts">
import { computed } from 'vue'
import type { WatermarkPassage, WatermarkSlot } from '@/data/watermarkPassage'
import type { SelectionMap } from '@/utils/watermarkSimulation'

const props = defineProps<{
  passage: WatermarkPassage
  selections: SelectionMap
  baseline: SelectionMap
}>()

const emit = defineEmits<{
  select: [slotId: string, choiceId: string]
}>()

const slotsById = computed(
  () => new Map(props.passage.slots.map((slot) => [slot.id, slot])),
)

function selectedChoiceId(slot: WatermarkSlot) {
  const requested = props.selections[slot.id]
  if (slot.alternatives.some((alternative) => alternative.id === requested)) return requested
  return props.baseline[slot.id] ?? slot.alternatives[0]?.id ?? ''
}

function selectedText(slot: WatermarkSlot) {
  const selectedId = selectedChoiceId(slot)
  return slot.alternatives.find((alternative) => alternative.id === selectedId)?.text ?? ''
}

function isChanged(slot: WatermarkSlot) {
  return selectedChoiceId(slot) !== props.baseline[slot.id]
}
</script>

<template>
  <div class="watermark-passage" aria-label="Interactive watermarked passage">
    <template v-for="(segment, index) in passage.segments" :key="`${segment.type}-${index}`">
      <template v-if="segment.type === 'text'">{{ segment.text }}</template>

      <UPopover
        v-else-if="slotsById.get(segment.slotId)"
        :content="{ side: 'bottom', align: 'start', sideOffset: 7, collisionPadding: 14 }"
      >
        <button
          type="button"
          class="word-choice"
          :class="{ 'word-choice--changed': isChanged(slotsById.get(segment.slotId)!) }"
          :aria-label="`Change the word ${selectedText(slotsById.get(segment.slotId)!)}`"
          :data-changed="isChanged(slotsById.get(segment.slotId)!) || undefined"
        >
          <span>{{ selectedText(slotsById.get(segment.slotId)!) }}</span>
          <span
            v-if="isChanged(slotsById.get(segment.slotId)!)"
            class="word-choice__edited"
            aria-hidden="true"
          >•</span>
          <span v-if="isChanged(slotsById.get(segment.slotId)!)" class="sr-only">(edited)</span>
          <UIcon name="i-lucide-chevron-down" class="word-choice__chevron" aria-hidden="true" />
        </button>

        <template #content="{ close }">
          <div class="choice-menu" :aria-label="`Alternatives for ${selectedText(slotsById.get(segment.slotId)!)}`">
            <p class="choice-menu__label">Choose another word</p>
            <button
              v-for="alternative in slotsById.get(segment.slotId)!.alternatives"
              :key="alternative.id"
              type="button"
              class="choice-menu__option"
              :class="{
                'choice-menu__option--selected':
                  alternative.id === selectedChoiceId(slotsById.get(segment.slotId)!),
              }"
              :aria-pressed="
                alternative.id === selectedChoiceId(slotsById.get(segment.slotId)!)
              "
              @click="
                emit('select', segment.slotId, alternative.id);
                close()
              "
            >
              <span>{{ alternative.text }}</span>
              <UIcon
                v-if="alternative.id === selectedChoiceId(slotsById.get(segment.slotId)!)"
                name="i-lucide-check"
                class="h-3.5 w-3.5"
                aria-hidden="true"
              />
            </button>
          </div>
        </template>
      </UPopover>
    </template>
  </div>
</template>

<style scoped>
.watermark-passage {
  max-width: 68ch;
  white-space: pre-line;
  font-family: ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif;
  font-size: clamp(1.05rem, 0.98rem + 0.2vw, 1.18rem);
  line-height: 1.82;
  color: var(--site-ink);
}

.word-choice {
  display: inline-flex;
  align-items: baseline;
  gap: 0.12rem;
  margin: 0 -0.06rem;
  padding: 0 0.18rem 0.03rem;
  border: 0;
  border-radius: 0.28rem;
  background: oklch(0.93 0.018 155);
  color: inherit;
  font: inherit;
  line-height: 1.42;
  text-decoration: underline;
  text-decoration-color: oklch(0.58 0.04 165 / 0.65);
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
  cursor: pointer;
  transition:
    background-color 160ms cubic-bezier(0.22, 1, 0.36, 1),
    color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}

.word-choice:hover {
  background: oklch(0.89 0.03 155);
}

.word-choice:focus-visible {
  outline: 2px solid var(--site-accent);
  outline-offset: 2px;
}

.word-choice--changed {
  background: oklch(0.93 0.02 75);
  text-decoration-style: dotted;
  text-decoration-color: oklch(0.5 0.035 70);
}

.word-choice__edited {
  color: oklch(0.48 0.04 70);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.72em;
  transform: translateY(-0.25em);
}

.word-choice__chevron {
  width: 0.72em;
  height: 0.72em;
  color: var(--site-muted);
}

.choice-menu {
  min-width: 12rem;
  padding: 0.38rem;
}

.choice-menu__label {
  margin: 0;
  padding: 0.35rem 0.48rem 0.42rem;
  color: var(--site-faint);
  font-size: 0.68rem;
  font-weight: 650;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.choice-menu__option {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.48rem 0.52rem;
  border: 0;
  border-radius: 0.36rem;
  background: transparent;
  color: var(--site-ink);
  font-size: 0.86rem;
  text-align: left;
  cursor: pointer;
}

.choice-menu__option:hover {
  background: var(--site-surface);
}

.choice-menu__option:focus-visible {
  background: var(--site-surface);
  outline: 2px solid var(--site-accent);
  outline-offset: -2px;
}

.choice-menu__option--selected {
  color: var(--site-accent);
  font-weight: 650;
}

@media (prefers-reduced-motion: reduce) {
  .word-choice {
    transition: none;
  }
}
</style>
