import { z } from 'zod'

export const StartGitHubInstallSchema = z.object({
  redirectTo: z.string().min(1, 'redirectTo is required'),
  connection_scope: z.enum(['personal', 'org_shared']).optional(),
})

export type StartGitHubInstallDto = z.infer<typeof StartGitHubInstallSchema>

export const ListRepoContentsSchema = z.object({
  path: z.string().default(''),
  ref: z.string().optional(),
})

export type ListRepoContentsDto = z.infer<typeof ListRepoContentsSchema>

export const CreateBranchSchema = z.object({
  branch: z.string().min(1, 'branch name is required'),
  from_branch: z.string().optional(),
})

export type CreateBranchDto = z.infer<typeof CreateBranchSchema>

export const CommitFilesSchema = z.object({
  branch: z.string().min(1, 'branch is required'),
  message: z.string().min(1, 'commit message is required'),
  files: z
    .array(
      z.object({
        path: z.string().min(1),
        content: z.string(),
      }),
    )
    .min(1, 'at least one file is required'),
})

export type CommitFilesDto = z.infer<typeof CommitFilesSchema>

export const CreateRepoSchema = z.object({
  name: z.string().min(1, 'repo name is required'),
  description: z.string().optional().default(''),
  private: z.boolean().optional().default(true),
  auto_init: z.boolean().optional().default(true),
})

export type CreateRepoDto = z.infer<typeof CreateRepoSchema>

export const CreatePullRequestSchema = z.object({
  title: z.string().min(1, 'title is required'),
  body: z.string().optional().default(''),
  head: z.string().min(1, 'head branch is required'),
  base: z.string().optional(),
})

export type CreatePullRequestDto = z.infer<typeof CreatePullRequestSchema>
