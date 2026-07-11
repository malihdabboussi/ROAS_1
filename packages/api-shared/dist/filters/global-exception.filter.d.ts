import { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { ErrorReporter } from '../services/error-reporter.service';
export declare class GlobalExceptionFilter implements ExceptionFilter {
    private readonly errorReporter?;
    private readonly logger;
    private readonly appName;
    constructor(errorReporter?: ErrorReporter | undefined);
    catch(exception: unknown, host: ArgumentsHost): void;
    private reportError;
}
