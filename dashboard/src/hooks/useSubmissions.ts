import { useQuery } from '@tanstack/react-query';
import { getSubmissions } from '../api/submissions';
import type { Submission } from '../types';

/** Polls every 30 seconds — used only by StatusBoard. */
export function useSubmissions(date: string) {
  return useQuery<Submission[], Error>({
    queryKey: ['submissions', date],
    queryFn: () => getSubmissions(date),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}
