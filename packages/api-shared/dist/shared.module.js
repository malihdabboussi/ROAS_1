"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedModule = void 0;
const common_1 = require("@nestjs/common");
const global_exception_filter_1 = require("./filters/global-exception.filter");
const auth_guard_1 = require("./guards/auth.guard");
const org_context_guard_1 = require("./guards/org-context.guard");
const org_role_guard_1 = require("./guards/org-role.guard");
const route_trace_reporter_service_1 = require("./observability/route-trace-reporter.service");
const error_reporter_service_1 = require("./services/error-reporter.service");
const logger_service_1 = require("./services/logger.service");
const org_scope_service_1 = require("./services/org-scope.service");
const postgres_direct_service_1 = require("./services/postgres-direct.service");
const supabase_client_factory_1 = require("./services/supabase-client.factory");
const supabase_jwt_verifier_service_1 = require("./services/supabase-jwt-verifier.service");
const supabase_service_client_provider_1 = require("./services/supabase-service-client.provider");
const user_session_mint_service_1 = require("./services/user-session-mint.service");
let SharedModule = class SharedModule {
};
exports.SharedModule = SharedModule;
exports.SharedModule = SharedModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            auth_guard_1.AuthGuard,
            org_context_guard_1.OrgContextGuard,
            org_role_guard_1.OrgRoleGuard,
            org_scope_service_1.OrgScopeService,
            supabase_jwt_verifier_service_1.SupabaseJwtVerifierService,
            logger_service_1.LoggerService,
            route_trace_reporter_service_1.RouteTraceReporter,
            error_reporter_service_1.ErrorReporter,
            global_exception_filter_1.GlobalExceptionFilter,
            supabase_client_factory_1.SupabaseClientFactory,
            supabase_service_client_provider_1.SupabaseServiceClient,
            user_session_mint_service_1.UserSessionMintService,
            postgres_direct_service_1.PostgresDirectService,
        ],
        exports: [
            auth_guard_1.AuthGuard,
            org_context_guard_1.OrgContextGuard,
            org_role_guard_1.OrgRoleGuard,
            org_scope_service_1.OrgScopeService,
            supabase_jwt_verifier_service_1.SupabaseJwtVerifierService,
            logger_service_1.LoggerService,
            route_trace_reporter_service_1.RouteTraceReporter,
            error_reporter_service_1.ErrorReporter,
            global_exception_filter_1.GlobalExceptionFilter,
            supabase_client_factory_1.SupabaseClientFactory,
            supabase_service_client_provider_1.SupabaseServiceClient,
            user_session_mint_service_1.UserSessionMintService,
            postgres_direct_service_1.PostgresDirectService,
        ],
    })
], SharedModule);
//# sourceMappingURL=shared.module.js.map