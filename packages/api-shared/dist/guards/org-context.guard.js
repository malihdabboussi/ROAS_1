"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OrgContextGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgContextGuard = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_client_provider_1 = require("../services/supabase-service-client.provider");
let OrgContextGuard = OrgContextGuard_1 = class OrgContextGuard {
    serviceClient;
    logger = new common_1.Logger(OrgContextGuard_1.name);
    constructor(serviceClient) {
        this.serviceClient = serviceClient;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const orgId = request.headers['x-org-id'];
        const userId = request.user?.id;
        if (!orgId) {
            request.orgId = null;
            request.orgRole = null;
            request.orgMemberId = null;
            request.organizationWideDataAccess = false;
            return true;
        }
        if (!userId) {
            throw new common_1.ForbiddenException('Authentication required for org context');
        }
        const { data: membership, error } = await this.serviceClient.client
            .from('org_members')
            .select('id, role, status, ai_data_admin')
            .eq('org_id', orgId)
            .eq('user_id', userId)
            .maybeSingle();
        if (error) {
            this.logger.error(`Org membership lookup failed: ${error.message}`);
            throw new common_1.ForbiddenException('Organization access verification failed');
        }
        if (!membership || membership.status !== 'active') {
            throw new common_1.ForbiddenException('You are not an active member of this organization');
        }
        request.orgId = orgId;
        request.orgRole = membership.role;
        request.orgMemberId = membership.id;
        request.organizationWideDataAccess =
            membership.role === 'owner' || membership.ai_data_admin === true;
        return true;
    }
};
exports.OrgContextGuard = OrgContextGuard;
exports.OrgContextGuard = OrgContextGuard = OrgContextGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_client_provider_1.SupabaseServiceClient])
], OrgContextGuard);
//# sourceMappingURL=org-context.guard.js.map