import { AppError, HttpClientError, TimeoutError } from '../lib/errors.js';
export function registerErrorHandler(app) {
    app.setErrorHandler((error, request, reply) => {
        if (error instanceof AppError) {
            return reply.status(error.statusCode).send({
                code: error.code,
                message: error.message,
                ...(error.details !== undefined && { details: error.details }),
            });
        }
        if (error instanceof HttpClientError) {
            const status = error.statusCode >= 500 ? 502 : error.statusCode;
            return reply.status(status).send({
                code: 'MT5_API_ERROR',
                message: error.message,
            });
        }
        if (error instanceof TimeoutError) {
            return reply.status(504).send({
                code: 'GATEWAY_TIMEOUT',
                message: error.message,
            });
        }
        // Fastify built-in validation errors
        const maybeValidation = error;
        if (maybeValidation.validation) {
            return reply.status(400).send({
                code: 'VALIDATION_ERROR',
                message: maybeValidation.message ?? 'Validation failed',
            });
        }
        request.log.error(error);
        return reply.status(500).send({
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
        });
    });
}
//# sourceMappingURL=error-handler.js.map