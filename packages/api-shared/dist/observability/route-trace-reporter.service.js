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
var RouteTraceReporter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteTraceReporter = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_client_provider_1 = require("../services/supabase-service-client.provider");
const source_code_pointer_1 = require("./source-code-pointer");
let RouteTraceReporter = RouteTraceReporter_1 = class RouteTraceReporter {
    svc;
    logger = new common_1.Logger(RouteTraceReporter_1.name);
    warnedUnavailable = false;
    constructor(svc) {
        this.svc = svc;
    }
    report(input) {
        this.reportNow(input).catch((err) => {
            this.warnOnce(`request_trace_events insert threw: ${this.formatError(err)}`);
        });
    }
    async reportNow(input) {
        const row = (0, source_code_pointer_1.normalizeRequestTraceEvent)(input);
        const { error } = await this.svc.client.from('request_trace_events').insert(row);
        if (error) {
            this.warnOnce(`Failed to persist request_trace_event: ${error.message}`);
        }
    }
    warnOnce(message) {
        if (this.warnedUnavailable)
            return;
        this.warnedUnavailable = true;
        this.logger.warn(message);
    }
    formatError(err) {
        return err instanceof Error ? err.message : String(err);
    }
};
exports.RouteTraceReporter = RouteTraceReporter;
exports.RouteTraceReporter = RouteTraceReporter = RouteTraceReporter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_client_provider_1.SupabaseServiceClient])
], RouteTraceReporter);
//# sourceMappingURL=route-trace-reporter.service.js.map