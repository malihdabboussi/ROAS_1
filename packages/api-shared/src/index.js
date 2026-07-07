'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.SupabaseClientFactory =
  exports.SupabaseJwtVerifierService =
  exports.PostgresDirectService =
  exports.prepareFunnelPageForWrite =
  exports.recoverFunnelTsx =
  exports.validateFunnelTsxContract =
  exports.normalizeFunnelPageSource =
  exports.buildSafeFallbackFunnelTsx =
  exports.InvalidTokenError =
  exports.AuthUpstreamUnavailableError =
  exports.AuthInputError =
  exports.AuthError =
  exports.isTransientNetworkError =
  exports.LoggerService =
  exports.GlobalExceptionFilter =
  exports.ZodValidationPipe =
  exports.Supabase =
  exports.CurrentUser =
  exports.ROLES_KEY =
  exports.Roles =
  exports.RoleGuard =
  exports.AuthGuard =
  exports.SharedModule =
    void 0
var shared_module_1 = require('./shared.module')
Object.defineProperty(exports, 'SharedModule', {
  enumerable: true,
  get: function () {
    return shared_module_1.SharedModule
  },
})
var auth_guard_1 = require('./guards/auth.guard')
Object.defineProperty(exports, 'AuthGuard', {
  enumerable: true,
  get: function () {
    return auth_guard_1.AuthGuard
  },
})
var role_guard_1 = require('./guards/role.guard')
Object.defineProperty(exports, 'RoleGuard', {
  enumerable: true,
  get: function () {
    return role_guard_1.RoleGuard
  },
})
Object.defineProperty(exports, 'Roles', {
  enumerable: true,
  get: function () {
    return role_guard_1.Roles
  },
})
Object.defineProperty(exports, 'ROLES_KEY', {
  enumerable: true,
  get: function () {
    return role_guard_1.ROLES_KEY
  },
})
var current_user_decorator_1 = require('./decorators/current-user.decorator')
Object.defineProperty(exports, 'CurrentUser', {
  enumerable: true,
  get: function () {
    return current_user_decorator_1.CurrentUser
  },
})
var supabase_decorator_1 = require('./decorators/supabase.decorator')
Object.defineProperty(exports, 'Supabase', {
  enumerable: true,
  get: function () {
    return supabase_decorator_1.Supabase
  },
})
var zod_validation_pipe_1 = require('./pipes/zod-validation.pipe')
Object.defineProperty(exports, 'ZodValidationPipe', {
  enumerable: true,
  get: function () {
    return zod_validation_pipe_1.ZodValidationPipe
  },
})
var global_exception_filter_1 = require('./filters/global-exception.filter')
Object.defineProperty(exports, 'GlobalExceptionFilter', {
  enumerable: true,
  get: function () {
    return global_exception_filter_1.GlobalExceptionFilter
  },
})
var logger_service_1 = require('./services/logger.service')
Object.defineProperty(exports, 'LoggerService', {
  enumerable: true,
  get: function () {
    return logger_service_1.LoggerService
  },
})
var auth_errors_1 = require('./services/auth-errors')
Object.defineProperty(exports, 'AuthError', {
  enumerable: true,
  get: function () {
    return auth_errors_1.AuthError
  },
})
Object.defineProperty(exports, 'AuthInputError', {
  enumerable: true,
  get: function () {
    return auth_errors_1.AuthInputError
  },
})
Object.defineProperty(exports, 'AuthUpstreamUnavailableError', {
  enumerable: true,
  get: function () {
    return auth_errors_1.AuthUpstreamUnavailableError
  },
})
Object.defineProperty(exports, 'InvalidTokenError', {
  enumerable: true,
  get: function () {
    return auth_errors_1.InvalidTokenError
  },
})
var postgres_direct_service_1 = require('./services/postgres-direct.service')
Object.defineProperty(exports, 'PostgresDirectService', {
  enumerable: true,
  get: function () {
    return postgres_direct_service_1.PostgresDirectService
  },
})
var supabase_client_factory_1 = require('./services/supabase-client.factory')
var supabase_jwt_verifier_service_1 = require('./services/supabase-jwt-verifier.service')
Object.defineProperty(exports, 'SupabaseJwtVerifierService', {
  enumerable: true,
  get: function () {
    return supabase_jwt_verifier_service_1.SupabaseJwtVerifierService
  },
})
Object.defineProperty(exports, 'SupabaseClientFactory', {
  enumerable: true,
  get: function () {
    return supabase_client_factory_1.SupabaseClientFactory
  },
})
var transient_error_util_1 = require('./services/transient-error.util')
Object.defineProperty(exports, 'isTransientNetworkError', {
  enumerable: true,
  get: function () {
    return transient_error_util_1.isTransientNetworkError
  },
})
var funnel_tsx_contract_1 = require('./services/funnel-tsx-contract')
Object.defineProperty(exports, 'buildSafeFallbackFunnelTsx', {
  enumerable: true,
  get: function () {
    return funnel_tsx_contract_1.buildSafeFallbackFunnelTsx
  },
})
Object.defineProperty(exports, 'normalizeFunnelPageSource', {
  enumerable: true,
  get: function () {
    return funnel_tsx_contract_1.normalizeFunnelPageSource
  },
})
Object.defineProperty(exports, 'validateFunnelTsxContract', {
  enumerable: true,
  get: function () {
    return funnel_tsx_contract_1.validateFunnelTsxContract
  },
})
Object.defineProperty(exports, 'recoverFunnelTsx', {
  enumerable: true,
  get: function () {
    return funnel_tsx_contract_1.recoverFunnelTsx
  },
})
Object.defineProperty(exports, 'prepareFunnelPageForWrite', {
  enumerable: true,
  get: function () {
    return funnel_tsx_contract_1.prepareFunnelPageForWrite
  },
})
//# sourceMappingURL=index.js.map
