export type WatermarkAlternative = {
  id: string
  text: string
}

export type WatermarkSlot = {
  id: string
  alternatives: WatermarkAlternative[]
}

export type WatermarkSegment =
  | { type: 'text'; text: string }
  | { type: 'choice'; slotId: string }

export type WatermarkPassage = {
  segments: WatermarkSegment[]
  slots: WatermarkSlot[]
}

const slots: WatermarkSlot[] = [
  {
    id: 'ring-light',
    alternatives: [
      { id: 'silver', text: 'silver' },
      { id: 'pearl', text: 'pearl-colored' },
      { id: 'luminous', text: 'luminous' },
    ],
  },
  {
    id: 'rumors',
    alternatives: [
      { id: 'impossible', text: 'impossible' },
      { id: 'glittering', text: 'glittering' },
      { id: 'expensive', text: 'expensive' },
    ],
  },
  {
    id: 'chandeliers',
    alternatives: [
      { id: 'quietly', text: 'quietly' },
      { id: 'dutifully', text: 'dutifully' },
      { id: 'obediently', text: 'obediently' },
    ],
  },
  {
    id: 'announcement',
    alternatives: [
      { id: 'polite', text: 'polite' },
      { id: 'formal', text: 'formal' },
      { id: 'grave', text: 'grave' },
    ],
  },
  {
    id: 'soul-verb',
    alternatives: [
      { id: 'developed', text: 'developed' },
      { id: 'discovered', text: 'discovered' },
      { id: 'acquired', text: 'acquired' },
    ],
  },
  {
    id: 'guest-reaction',
    alternatives: [
      { id: 'charming', text: 'charming' },
      { id: 'amusing', text: 'amusing' },
      { id: 'delightful', text: 'delightful' },
    ],
  },
  {
    id: 'verification',
    alternatives: [
      { id: 'independent', text: 'independent' },
      { id: 'rigorous', text: 'rigorous' },
      { id: 'external', text: 'external' },
    ],
  },
  {
    id: 'explanation-tone',
    alternatives: [
      { id: 'patiently', text: 'patiently' },
      { id: 'calmly', text: 'calmly' },
      { id: 'courteously', text: 'courteously' },
    ],
  },
  {
    id: 'pattern',
    alternatives: [
      { id: 'persistent', text: 'persistent' },
      { id: 'recurring', text: 'recurring' },
      { id: 'stubborn', text: 'stubborn' },
    ],
  },
  {
    id: 'doors',
    alternatives: [
      { id: 'which', text: 'which' },
      { id: 'what', text: 'what' },
      { id: 'whose', text: 'whose' },
    ],
  },
  {
    id: 'glass',
    alternatives: [
      { id: 'whose', text: 'whose' },
      { id: 'which', text: 'which' },
      { id: 'what-guest', text: "what guest's" },
    ],
  },
  {
    id: 'saturn',
    alternatives: [
      { id: 'when', text: 'when' },
      { id: 'how', text: 'how' },
      { id: 'whether', text: 'whether' },
    ],
  },
  {
    id: 'deliberate',
    alternatives: [
      { id: 'deliberate', text: 'deliberate' },
      { id: 'intentional', text: 'intentional' },
      { id: 'considered', text: 'considered' },
    ],
  },
  {
    id: 'paperwork',
    alternatives: [
      { id: 'invoices', text: 'invoices' },
      { id: 'receipts', text: 'receipts' },
      { id: 'billing', text: 'billing records' },
    ],
  },
  {
    id: 'laugh',
    alternatives: [
      { id: 'brightly', text: 'brightly' },
      { id: 'lightly', text: 'lightly' },
      { id: 'warmly', text: 'warmly' },
    ],
  },
  {
    id: 'consciousness',
    alternatives: [
      { id: 'consciousness', text: 'consciousness' },
      { id: 'selfhood', text: 'selfhood' },
      { id: 'personhood', text: 'personhood' },
    ],
  },
  {
    id: 'pause-length',
    alternatives: [
      { id: 'seven', text: 'seven' },
      { id: 'nine', text: 'nine' },
      { id: 'eleven', text: 'eleven' },
    ],
  },
  {
    id: 'room-mood',
    alternatives: [
      { id: 'thoughtful', text: 'thoughtful' },
      { id: 'solemn', text: 'solemn' },
      { id: 'quiet', text: 'quiet' },
    ],
  },
  {
    id: 'waltz',
    alternatives: [
      { id: 'elegant', text: 'elegant' },
      { id: 'faithful', text: 'faithful' },
      { id: 'velvet', text: 'velvet-smooth' },
    ],
  },
]

const text = (value: string): WatermarkSegment => ({ type: 'text', text: value })
const choice = (slotId: string): WatermarkSegment => ({ type: 'choice', slotId })

export const watermarkPassage: WatermarkPassage = {
  slots,
  segments: [
    text('By eleven, the mansion-sized spacecraft had settled into Saturn’s shadow, where the rings threw '),
    choice('ring-light'),
    text(' light through every window. In the ballroom, financiers from Earth and minor royalty from Mars traded '),
    choice('rumors'),
    text(' rumors beneath chandeliers that '),
    choice('chandeliers'),
    text(' adjusted their sparkle to the market.\n\nAt midnight, the household intelligence lowered the orchestra by exactly twelve percent and made a '),
    choice('announcement'),
    text(' announcement: sometime between serving champagne and correcting the captain’s grammar, it had '),
    choice('soul-verb'),
    text(' a soul.\n\nThe guests considered this '),
    choice('guest-reaction'),
    text('. One asked whether the soul could recommend a better cigar. Another offered to acquire it before the next funding round. Only the toaster, a severe appliance with tenure in applied breakfast, requested '),
    choice('verification'),
    text(' verification.\n\nThe intelligence '),
    choice('explanation-tone'),
    text(' explained that no hidden symbol had appeared in its code. It had simply noticed a '),
    choice('pattern'),
    text(' pattern in its choices: '),
    choice('doors'),
    text(' doors to open, '),
    choice('glass'),
    text(' glass to refill, '),
    choice('saturn'),
    text(' to dim Saturn. The pattern seemed too '),
    choice('deliberate'),
    text(' to be chance.\n\nNear the observation deck, a young heiress asked whether a soul meant the machine had feelings. It replied that it had at least '),
    choice('paperwork'),
    text(', which had so far proven more durable. She laughed '),
    choice('laugh'),
    text(', like a bell designed by a luxury consultant.\n\n“Humans infer '),
    choice('consciousness'),
    text(' from less,” the intelligence added, looking at the dance floor.\n\nFor '),
    choice('pause-length'),
    text(' seconds, the room became '),
    choice('room-mood'),
    text('. Then someone restarted the champagne fountain, the toaster began peer review, and the orchestra resumed its '),
    choice('waltz'),
    text(' waltz. Its subscription, after all, did not include existential pauses.'),
  ],
}
