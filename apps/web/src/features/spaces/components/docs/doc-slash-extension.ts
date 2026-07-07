import { Extension } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import { Suggestion, type SuggestionOptions } from '@tiptap/suggestion'

export const DocSlashCommandKey = new PluginKey('docSlashCommand')

export const DocSlashCommand = Extension.create<{
  suggestion: Omit<SuggestionOptions, 'editor'>
}>({
  name: 'docSlashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        pluginKey: DocSlashCommandKey,
        allowSpaces: false,
        startOfLine: false,
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})
