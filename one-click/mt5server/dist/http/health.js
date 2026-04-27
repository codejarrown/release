const statusSchema = {
    type: 'object',
    properties: { status: { type: 'string' } },
};
export function registerHealthRoutes(app) {
    app.get('/healthz', {
        schema: {
            tags: ['Health'],
            summary: 'Liveness probe',
            security: [],
            response: { 200: statusSchema },
        },
    }, async () => {
        return { status: 'ok' };
    });
    app.get('/readyz', {
        schema: {
            tags: ['Health'],
            summary: 'Readiness probe',
            security: [],
            response: { 200: statusSchema },
        },
    }, async () => {
        return { status: 'ready' };
    });
}
//# sourceMappingURL=health.js.map