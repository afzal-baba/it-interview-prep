import { QueryClient } from '@tanstack/react-query';

/**
 * Singleton QueryClient shared across the app.
 * Import this wherever direct cache access (removeQueries / invalidateQueries)
 * is needed outside of a React component (e.g. auth provider, secure-store helpers).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 2 },
  },
});
