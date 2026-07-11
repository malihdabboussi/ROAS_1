"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgScopeService = void 0;
exports.applyOwnerScope = applyOwnerScope;
exports.resolveScopedOrgId = resolveScopedOrgId;
const common_1 = require("@nestjs/common");
const ORG_ROLE_HIERARCHY = {
    owner: 5,
    admin: 4,
    creator: 3,
    editor: 2,
    viewer: 1,
};
function applyOwnerScope(query, scope) {
    if (scope.orgId) {
        return query.eq('org_id', scope.orgId);
    }
    return query.eq('user_id', scope.userId).is('org_id', null);
}
function resolveScopedOrgId(scope) {
    return scope.orgId ?? null;
}
let OrgScopeService = class OrgScopeService {
    applyScope(query, scope) {
        return applyOwnerScope(query, scope);
    }
    getInsertData(scope) {
        return {
            user_id: scope.userId,
            org_id: resolveScopedOrgId(scope),
        };
    }
    hasMinimumRole(userRole, requiredRole) {
        if (!userRole)
            return false;
        return ORG_ROLE_HIERARCHY[userRole] >= ORG_ROLE_HIERARCHY[requiredRole];
    }
    isOrgContext(scope) {
        return scope.orgId !== null;
    }
    static buildScopeFromRequest(request) {
        return {
            userId: request.user?.id,
            orgId: request.orgId ?? null,
            orgRole: request.orgRole ?? null,
        };
    }
};
exports.OrgScopeService = OrgScopeService;
exports.OrgScopeService = OrgScopeService = __decorate([
    (0, common_1.Injectable)()
], OrgScopeService);
//# sourceMappingURL=org-scope.service.js.map