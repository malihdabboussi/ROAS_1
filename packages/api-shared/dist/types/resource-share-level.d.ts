import { z } from 'zod';
import type { OrgRole } from '../services/org-scope.service';
export declare const ResourceShareLevelSchema: z.ZodEnum<["admin", "edit", "view"]>;
export type ResourceShareLevel = z.infer<typeof ResourceShareLevelSchema>;
export declare const RESOURCE_SHARE_LEVEL_WEIGHT: Record<ResourceShareLevel, number>;
export declare const ORG_ROLE_RESOURCE_BASELINE: Record<OrgRole, ResourceShareLevel>;
export declare function maxResourceShareLevel(levels: Array<ResourceShareLevel | null | undefined>): ResourceShareLevel | null;
export declare function meetsResourceShareLevel(actual: ResourceShareLevel | null | undefined, required: ResourceShareLevel): boolean;
export declare function baselineFromOrgRole(orgRole: OrgRole | null | undefined): ResourceShareLevel | null;
