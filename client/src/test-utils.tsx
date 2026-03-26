import React, { type ReactNode } from 'react';
import { render as rtlRender, cleanup, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

const wrapper = ({ children }: { children?: ReactNode }) => {
  const queryClient = createTestQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const render = (ui: React.ReactElement, options: RenderOptions = {}) =>
  rtlRender(ui, { wrapper, ...options });

export * from '@testing-library/react';
export { render, cleanup };
