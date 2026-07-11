import { CanActivate, ExecutionContext } from '@nestjs/common';
export type UserRole = 'user' | 'power' | 'admin' | 'enterprise' | 'superadmin';
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: UserRole[]) => import("@nestjs/common").CustomDecorator<string>;
export declare class RoleGuard implements CanActivate {
    private readonly logger;
    private readonly reflector;
    canActivate(context: ExecutionContext): Promise<boolean>;
}
