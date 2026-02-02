import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import CoffeeCounterCalloutNodeView from '@/components/tiptap/CoffeeCounterCalloutNodeView.vue'

const CoffeeCounterCalloutNode = Node.create({
  name: 'coffeeCounterCallout',
  group: 'block',
  atom: true,
  selectable: true,

  parseHTML() {
    return [{ tag: 'coffee-counter-callout' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['coffee-counter-callout', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return VueNodeViewRenderer(CoffeeCounterCalloutNodeView, {
      contentDOMElementTag: 'div',
    })
  },
})

export default CoffeeCounterCalloutNode
