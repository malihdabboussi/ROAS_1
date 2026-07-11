import { CanActivate, ExecutionContext } from '@nestjs/common';
import type { OrgRole } from '../services/org-scope.service';
export declare const ORG_ROLE_KEY = "requiredOrgRole";
export declare const RequireOrgRole: (role: OrgRole) => import("@nestjs/common").CustomDecorator<string>;
export declare class OrgRoleGuard implements CanActivate {
    private readonly logger;
    private readonly reflector;
    canActivate(context: ExecutionContext): Promise<boolean>;
}
