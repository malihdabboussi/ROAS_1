"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var OrgRoleGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgRoleGuard = exports.RequireOrgRole = exports.ORG_ROLE_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
exports.ORG_ROLE_KEY = 'requiredOrgRole';
const RequireOrgRole = (role) => (0, common_1.SetMetadata)(exports.ORG_ROLE_KEY, role);
exports.RequireOrgRole = RequireOrgRole;
const ORG_ROLE_HIERARCHY = {
    owner: 5,
    admin: 4,
    creator: 3,
    editor: 2,
    viewer: 1,
};
let OrgRoleGuard = OrgRoleGuard_1 = class OrgRoleGuard {
    logger = new common_1.Logger(OrgRoleGuard_1.name);
    reflector = new core_1.Reflector();
    async canActivate(context) {
        const requiredRole = this.reflector.getAllAndOverride(exports.ORG_ROLE_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRole) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const orgId = request.orgId;
        const orgRole = request.orgRole;
        if (!orgId) {
            return true;
        }
        if (!orgRole) {
            throw new common_1.ForbiddenException('Organization role not resolved');
        }
        const userLevel = ORG_ROLE_HIERARCHY[orgRole];
        const requiredLevel = ORG_ROLE_HIERARCHY[requiredRole];
        if (userLevel < requiredLevel) {
            throw new common_1.ForbiddenException(`This action requires "${requiredRole}" role. Your role is "${orgRole}".`);
        }
        return true;
    }
};
exports.OrgRoleGuard = OrgRoleGuard;
exports.OrgRoleGuard = OrgRoleGuard = OrgRoleGuard_1 = __decorate([
    (0, common_1.Injectable)()
], OrgRoleGuard);
//# sourceMappingURL=org-role.guard.js.map