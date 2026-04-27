import { zodToJsonSchema } from 'zod-to-json-schema';
/**
 * Convert Zod schema to JSON Schema draft-07 (compatible with Fastify's ajv).
 * Uses jsonSchema7 target (not openApi3) to ensure exclusiveMinimum is a number.
 * Strips $schema so Fastify uses its own default.
 */
export function zToSchema(schema) {
    const raw = zodToJsonSchema(schema, { $refStrategy: 'none' });
    delete raw.$schema;
    return raw;
}
export function idParam(name = 'id', description = 'Resource ID') {
    return {
        type: 'object',
        required: [name],
        properties: {
            [name]: { type: 'integer', minimum: 1, description },
        },
    };
}
export const errorResponse = {
    type: 'object',
    properties: {
        code: { type: 'string' },
        message: { type: 'string' },
    },
};
export function dataResponse(itemSchema) {
    return {
        type: 'object',
        properties: {
            data: itemSchema,
        },
    };
}
export function dataArrayResponse(itemSchema) {
    return {
        type: 'object',
        properties: {
            data: { type: 'array', items: itemSchema },
        },
    };
}
//# sourceMappingURL=schema-helper.js.map