"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RoleGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleGuard = exports.Roles = exports.ROLES_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const supabase_js_1 = require("@supabase/supabase-js");
exports.ROLES_KEY = 'roles';
const Roles = (...roles) => (0, common_1.SetMetadata)(exports.ROLES_KEY, roles);
exports.Roles = Roles;
let RoleGuard = RoleGuard_1 = class RoleGuard {
    logger = new common_1.Logger(RoleGuard_1.name);
    reflector = new core_1.Reflector();
    async canActivate(context) {
        const requiredRoles = this.reflector.getAllAndOverride(exports.ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.id;
        if (!userId) {
            throw new common_1.ForbiddenException('User not authenticated');
        }
        const url = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !serviceKey) {
            this.logger.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for role check');
            throw new common_1.ForbiddenException('Role verification unavailable');
        }
        const serviceClient = (0, supabase_js_1.createClient)(url, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        });
        const { data: profile, error } = await serviceClient
            .from('user_profiles')
            .select('role')
            .eq('id', userId)
            .single();
        if (error) {
            this.logger.warn(`Role lookup failed for ${userId}: ${error.message} (${error.code || 'no-code'})`);
            if (requiredRoles.includes('user'))
                return true;
            throw new common_1.ForbiddenException('Role verification unavailable');
        }
        if (!profile) {
            this.logger.warn(`No profile found for user ${userId}, defaulting to 'user' role`);
            if (requiredRoles.includes('user'))
                return true;
            throw new common_1.ForbiddenException('Insufficient permissions');
        }
        const userRole = profile.role;
        if (userRole === 'superadmin')
            return true;
        if (requiredRoles.includes('superadmin')) {
            throw new common_1.ForbiddenException(`Role '${userRole}' does not have access. Required: ${requiredRoles.join(', ')}`);
        }
        if (userRole === 'admin')
            return true;
        if (userRole === 'power' && requiredRoles.some((r) => r === 'power' || r === 'user'))
            return true;
        if (userRole === 'enterprise' && requiredRoles.some((r) => r === 'power' || r === 'user'))
            return true;
        if (requiredRoles.includes(userRole))
            return true;
        throw new common_1.ForbiddenException(`Role '${userRole}' does not have access. Required: ${requiredRoles.join(', ')}`);
    }
};
exports.RoleGuard = RoleGuard;
exports.RoleGuard = RoleGuard = RoleGuard_1 = __decorate([
    (0, common_1.Injectable)()
], RoleGuard);
//# sourceMappingURL=role.guard.js.map