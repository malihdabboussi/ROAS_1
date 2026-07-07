import { ResizableNodeView } from '@tiptap/core'
import Image from '@tiptap/extension-image'

export const DocEditorImage = Image.extend({
  addNodeView() {
    if (!this.options.resize || !this.options.resize.enabled || typeof document === 'undefined') {
      return null
    }

    const { directions, minWidth, minHeight, alwaysPreserveAspectRatio } = this.options.resize

    return ({ node, getPos, HTMLAttributes, editor }) => {
      const el = document.createElement('img')

      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        if (value != null) {
          switch (key) {
            case 'width':
            case 'height':
              break
            default:
              el.setAttribute(key, value)
              break
          }
        }
      })

      el.src = HTMLAttributes.src
      el.setAttribute('data-drag-handle', '')

      const nodeView = new ResizableNodeView({
        element: el,
        editor,
        node,
        getPos,
        onResize: (width, height) => {
          el.style.width = `${width}px`
          el.style.height = `${height}px`
        },
        onCommit: (width, height) => {
          const pos = getPos()
          if (pos === undefined) return

          this.editor
            .chain()
            .setNodeSelection(pos)
            .updateAttributes(this.name, { width, height })
            .run()
        },
        onUpdate: (updatedNode) => {
          if (updatedNode.type !== node.type) return false
          return true
        },
        options: {
          directions,
          min: {
            width: minWidth,
            height: minHeight,
          },
          preserveAspectRatio: alwaysPreserveAspectRatio === true,
        },
      })

      const dom = nodeView.dom as HTMLElement

      dom.style.visibility = 'hidden'
      dom.style.pointerEvents = 'none'
      dom.setAttribute('draggable', 'true')
      el.draggable = false
      el.onload = () => {
        dom.style.visibility = ''
        dom.style.pointerEvents = ''
      }

      return {
        dom: nodeView.dom,
        contentDOM: nodeView.contentDOM,
        update: nodeView.update.bind(nodeView),
        destroy: nodeView.destroy.bind(nodeView),
        stopEvent(event: Event) {
          const target = event.target
          if (!(target instanceof Element)) return false
          if (target.closest('[data-resize-handle]')) return true
          return false
        },
      }
    }
  },
})
