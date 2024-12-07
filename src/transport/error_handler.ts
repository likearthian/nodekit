import * as context from '../context/context';
import * as winston from 'winston';
import type { Logger } from '../log/logger';

// ErrorHandler receives a transport error to be processed for diagnostic purposes.
// Usually this means logging the error.
export interface ErrorHandler {
    Handle(ctx: context.Context, err: any): void
}

// LogErrorHandler is a transport error handler implementation which logs an error.
export class LogErrorHandler implements ErrorHandler{
    private logger: Logger = winston.createLogger();

    constructor(logger: Logger) {
        this.logger = logger;
    }

    Handle(ctx: context.Context, err: any): void {
        this.logger.error(err);
    }
}

// The ErrorHandlerFunc type is an adapter to allow the use of
// ordinary function as ErrorHandler. If f is a function
// with the appropriate signature, ErrorHandlerFunc(f) is a
// ErrorHandler that calls f.
export type ErrorHandlerFunc = (ctx: context.Context, err: string) => void;

