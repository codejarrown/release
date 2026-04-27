import type { ZodType } from 'zod';
import type { JsonSchema7Type } from 'zod-to-json-schema';
/**
 * Convert Zod schema to JSON Schema draft-07 (compatible with Fastify's ajv).
 * Uses jsonSchema7 target (not openApi3) to ensure exclusiveMinimum is a number.
 * Strips $schema so Fastify uses its own default.
 */
export declare function zToSchema(schema: ZodType): JsonSchema7Type;
export declare function idParam(name?: string, description?: string): {
    type: "object";
    required: string[];
    properties: {
        [name]: {
            type: "integer";
            minimum: number;
            description: string;
        };
    };
};
export declare const errorResponse: {
    type: "object";
    properties: {
        code: {
            type: "string";
        };
        message: {
            type: "string";
        };
    };
};
export declare function dataResponse(itemSchema: Record<string, unknown>): {
    type: "object";
    properties: {
        data: Record<string, unknown>;
    };
};
export declare function dataArrayResponse(itemSchema: Record<string, unknown>): {
    type: "object";
    properties: {
        data: {
            type: "array";
            items: Record<string, unknown>;
        };
    };
};
//# sourceMappingURL=schema-helper.d.ts.map