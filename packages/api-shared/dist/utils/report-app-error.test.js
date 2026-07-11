"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const report_app_error_1 = require("./report-app-error");
(0, vitest_1.describe)('reportAppError', () => {
    (0, vitest_1.it)('calls errorReporter.report and marks error as reported', () => {
        const report = vitest_1.vi.fn();
        const errorReporter = { report };
        const err = new Error('upstream failed');
        (0, report_app_error_1.reportAppError)(errorReporter, {
            app: 'api',
            category: 'integration',
            feature: 'integrations/scrapecreators',
            error_code: 'network_failed',
            message: 'upstream failed',
        }, err);
        (0, vitest_1.expect)(report).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(err.__appErrorReported).toBe(true);
    });
    (0, vitest_1.it)('reports without marking when error is omitted', () => {
        const report = vitest_1.vi.fn();
        const errorReporter = { report };
        (0, report_app_error_1.reportAppError)(errorReporter, {
            app: 'api',
            feature: 'brain/import_jobs',
            error_code: 'cycle_failed',
            message: 'cycle failed',
        });
        (0, vitest_1.expect)(report).toHaveBeenCalledOnce();
    });
});
(0, vitest_1.describe)('markAppErrorReported', () => {
    (0, vitest_1.it)('sets __appErrorReported on Error instances only', () => {
        const err = new Error('x');
        (0, report_app_error_1.markAppErrorReported)(err);
        (0, vitest_1.expect)(err.__appErrorReported).toBe(true);
        (0, report_app_error_1.markAppErrorReported)('not an error');
    });
});
//# sourceMappingURL=report-app-error.test.js.map