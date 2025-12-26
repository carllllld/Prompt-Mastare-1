import { z } from 'zod';
import { optimizeRequestSchema, optimizeResponseSchema } from './schema';

export const api = {
  optimize: {
    method: 'POST' as const,
    path: '/api/optimize',
    input: optimizeRequestSchema,
    responses: {
      200: optimizeResponseSchema,
      500: z.object({ message: z.string() }),
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
