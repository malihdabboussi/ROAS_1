import { z } from 'zod'

export const SuggestConversationTitleBodySchema = z.object({
  user_message: z
    .string()
    .max(8000)
    .transform((s) => s.trim())
    .pipe(z.string().min(1, 'user_message is required')),
})

export type SuggestConversationTitleBody = z.infer<typeof SuggestConversationTitleBodySchema>
