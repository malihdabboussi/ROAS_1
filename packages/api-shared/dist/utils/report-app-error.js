"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAppErrorReported = markAppErrorReported;
exports.reportAppError = reportAppError;
function markAppErrorReported(error) {
    if (error instanceof Error) {
        Object.defineProperty(error, '__appErrorReported', { value: true, enumerable: false });
    }
}
function reportAppError(errorReporter, params, error) {
    errorReporter.report(params);
    if (error !== undefined) {
        markAppErrorReported(error);
    }
}
//# sourceMappingURL=report-app-error.js.map