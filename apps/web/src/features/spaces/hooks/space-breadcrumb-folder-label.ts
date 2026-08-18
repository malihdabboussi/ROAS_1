import {
  firstSpecificAncestor,
  isGeneralLabel,
} from '@/components/conversations/conversation-scope-sort'

/** Middle crumb: client/program when the campaign itself is General. */
export function spaceBreadcrumbFolderLabel(
  campaignName: string | null,
  programName: string | null,
): string | null {
  if (campaignName && !isGeneralLabel(campaignName)) return campaignName
  return firstSpecificAncestor([programName, campaignName]) ?? campaignName
}
