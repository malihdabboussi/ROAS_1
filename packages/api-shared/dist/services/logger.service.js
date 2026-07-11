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
var LoggerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerService = void 0;
const common_1 = require("@nestjs/common");
const error_reporter_service_1 = require("./error-reporter.service");
let LoggerService = LoggerService_1 = class LoggerService {
    errorReporter;
    logger = new common_1.Logger(LoggerService_1.name);
    constructor(errorReporter) {
        this.errorReporter = errorReporter;
    }
    async logError(params) {
        this.logger.error(`[${params.severity.toUpperCase()}] ${params.feature}/${params.error_code}: ${params.message}`, params.context ? JSON.stringify(params.context) : undefined);
        const app = process.env.APP_NAME ?? 'api';
        const severity = params.severity === 'critical'
            ? 'critical'
            : params.severity === 'warn' || params.severity === 'info'
                ? 'warn'
                : 'error';
        this.errorReporter.report({
            app,
            severity,
            feature: params.feature,
            error_code: params.error_code,
            message: params.message,
            context: params.context,
            stack: params.stack,
            user_id: params.user_id,
            trace_id: params.trace_id,
            message_id: params.message_id,
            request_id: params.request_id,
            run_id: params.run_id,
            conversation_id: params.conversation_id,
        });
    }
};
exports.LoggerService = LoggerService;
exports.LoggerService = LoggerService = LoggerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [error_reporter_service_1.ErrorReporter])
], LoggerService);
//# sourceMappingURL=logger.service.js.map