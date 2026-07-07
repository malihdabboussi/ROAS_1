import { z } from 'zod'

const NonEmptyString = z.string().trim().min(1)
const OptionalPositiveInt = z.coerce.number().int().positive().optional()
const OptionalNonNegativeInt = z.coerce.number().int().nonnegative().optional()

const GoogleLocationLanguageSchema = z.object({
  location_code: OptionalPositiveInt,
  location_name: NonEmptyString.optional(),
  language_code: NonEmptyString.optional(),
  language_name: NonEmptyString.optional(),
})

export const KeywordOverviewSchema = GoogleLocationLanguageSchema.extend({
  keywords: z.array(NonEmptyString).min(1).max(700),
})

export type KeywordOverviewDto = z.infer<typeof KeywordOverviewSchema>

export const KeywordIdeasSchema = GoogleLocationLanguageSchema.extend({
  keywords: z.array(NonEmptyString).min(1),
  limit: OptionalPositiveInt,
  offset: OptionalNonNegativeInt,
})

export type KeywordIdeasDto = z.infer<typeof KeywordIdeasSchema>

export const GoogleSerpSchema = GoogleLocationLanguageSchema.extend({
  keyword: NonEmptyString,
  depth: OptionalPositiveInt,
  device: z.enum(['desktop', 'mobile']).optional(),
  os: NonEmptyString.optional(),
})

export type GoogleSerpDto = z.infer<typeof GoogleSerpSchema>

export const CompetitorsDomainSchema = GoogleLocationLanguageSchema.extend({
  target: NonEmptyString,
  intersecting_domains: z.array(NonEmptyString).optional(),
  filters: z.array(z.unknown()).optional(),
  limit: OptionalPositiveInt,
  offset: OptionalNonNegativeInt,
})

export type CompetitorsDomainDto = z.infer<typeof CompetitorsDomainSchema>

export const BacklinksSummarySchema = z.object({
  target: NonEmptyString,
  internal_list_limit: OptionalPositiveInt,
  include_subdomains: z.boolean().optional(),
  backlinks_status_type: z.enum(['all', 'live', 'lost']).optional(),
})

export type BacklinksSummaryDto = z.infer<typeof BacklinksSummarySchema>

export type DataForSeoTaskDto =
  | KeywordOverviewDto
  | KeywordIdeasDto
  | GoogleSerpDto
  | CompetitorsDomainDto
  | BacklinksSummaryDto
