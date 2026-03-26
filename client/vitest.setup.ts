import React, { type ReactNode, type ReactElement } from 'react';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as rtl from '@testing-library/react';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Provide a React Query context for all RTL renders in tests
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

const customRender = (ui: ReactElement, options: Record<string, unknown> = {}) => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: { children?: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return rtl.render(ui, { wrapper: Wrapper, ...options });
};

// Override testing-library render to automatically include React Query context.
vi.mock('@testing-library/react', async () => {
  const actual = await vi.importActual<typeof import('@testing-library/react')>('@testing-library/react');
  return {
    ...actual,
    render: (ui: ReactElement, options: Record<string, unknown> = {}) => customRender(ui, options),
  };
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});
