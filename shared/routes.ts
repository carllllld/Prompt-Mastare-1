import { z } from 'zod';
import { optimizeErrorSchema, optimizeRequestSchema, optimizeResponseSchema, type OptimizeRequest, type OptimizeResponse } from './schema';

export type { OptimizeRequest, OptimizeResponse };

export const api = {
  optimize: {
    method: 'POST' as const,
    path: '/api/optimize',
    input: optimizeRequestSchema,
    responses: {
      200: optimizeResponseSchema,
      400: optimizeErrorSchema,
      429: optimizeErrorSchema,
      500: optimizeErrorSchema,
      503: optimizeErrorSchema,
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
