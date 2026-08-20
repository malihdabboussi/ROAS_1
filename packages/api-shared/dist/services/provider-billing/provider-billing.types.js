"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROVIDER_OUTPUT_VALIDATION_STATES = exports.PROVIDER_BILLING_ATTEMPT_STATUSES = void 0;
exports.PROVIDER_BILLING_ATTEMPT_STATUSES = [
    'pending_provider_id',
    'pending_settlement',
    'settling',
    'settled',
    'no_charge',
    'failed_retryable',
    'unrecoverable',
    'charge_failed',
];
exports.PROVIDER_OUTPUT_VALIDATION_STATES = [
    'not_required',
    'pending',
    'validated',
    'provider_failed',
    'output_invalid',
    'paid_output_invalid',
];
//# sourceMappingURL=provider-billing.types.js.map