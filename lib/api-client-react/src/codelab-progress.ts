import { useQuery, useMutation } from "@tanstack/react-query";
import type {
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
  QueryKey,
} from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { ErrorType } from "./custom-fetch";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CodelabSessionProgress {
  totalScore: number;
  completedSlugs: string[];
}

export interface SaveCodelabProgressInput {
  totalScore: number;
  completedSlugs: string[];
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

export const getCodelabProgress = (
  options?: Parameters<typeof customFetch>[1],
): Promise<CodelabSessionProgress> =>
  customFetch<CodelabSessionProgress>("/api/codelab-progress", {
    ...options,
    method: "GET",
    credentials: "include",
  });

export const saveCodelabProgress = (
  input: SaveCodelabProgressInput,
  options?: Parameters<typeof customFetch>[1],
): Promise<CodelabSessionProgress> =>
  customFetch<CodelabSessionProgress>("/api/codelab-progress", {
    ...options,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...((options?.headers as Record<string, string>) ?? {}),
    },
    body: JSON.stringify(input),
    credentials: "include",
  });

// ── React Query hooks ─────────────────────────────────────────────────────────

export const getCodelabProgressQueryKey = () => ["/api/codelab-progress"] as const;

export function useGetCodelabProgress<
  TData = CodelabSessionProgress,
  TError = ErrorType<unknown>,
>(
  options?: { query?: UseQueryOptions<CodelabSessionProgress, TError, TData> },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryKey = getCodelabProgressQueryKey();
  const result = useQuery<CodelabSessionProgress, TError, TData>({
    queryKey,
    queryFn: ({ signal }) => getCodelabProgress({ signal }),
    ...options?.query,
  }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  Object.defineProperty(result, "queryKey", {
    value: queryKey,
    enumerable: true,
    configurable: true,
  });
  return result;
}

export const useSaveCodelabProgress = <
  TError = ErrorType<void>,
  TContext = unknown,
>(
  options?: {
    mutation?: UseMutationOptions<
      CodelabSessionProgress,
      TError,
      SaveCodelabProgressInput,
      TContext
    >;
  },
): UseMutationResult<
  CodelabSessionProgress,
  TError,
  SaveCodelabProgressInput,
  TContext
> =>
  useMutation<CodelabSessionProgress, TError, SaveCodelabProgressInput, TContext>({
    mutationFn: (data) => saveCodelabProgress(data),
    ...options?.mutation,
  });
