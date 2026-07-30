import { z } from 'zod'

export const CreateMissionReceiptDtoSchema = z.object({
  mission_id: z.string().uuid(),
  mission_title: z.string().trim().min(1).max(500),
  space_id: z.string().uuid().optional(),
})

export type CreateMissionReceiptDto = z.infer<typeof CreateMissionReceiptDtoSchema>
