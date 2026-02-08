import {
  useQuery,
  useQueries,
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  getAvatar,
  createAvatar,
  deleteAvatar,
  updateAvatar,
  analyzeAvatar,
  type Avatar,
  type CreateAvatarParams,
  type UpdateAvatarParams,
} from '@client/lib/n2wApi';
import type { AnalyzeAvatarResponseDto } from '@shared/dtos/avatar';
import { getAvatarIds, addAvatarId, removeAvatarId } from '@client/lib/avatarStorage';
import { queryKeys } from '@client/lib/queryClient';

/** Avatar list backed by localStorage IDs. */
export function useAvatars() {
  const idsQuery = useQuery({
    queryKey: queryKeys.avatars.list(),
    queryFn: () => getAvatarIds(),
    staleTime: Infinity,
  });

  const ids = idsQuery.data ?? [];

  const avatarQueries = useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.avatars.detail(id),
      queryFn: () => getAvatar(id),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const avatars: Avatar[] = [];
  for (const q of avatarQueries) {
    if (q.data) avatars.push(q.data);
  }

  const isPending = avatarQueries.some((q) => q.isPending);

  return { ids, avatars, isPending, isEmpty: ids.length === 0 };
}

/** Single avatar by ID. */
export function useAvatar(
  avatarId: string | undefined,
  options?: Omit<UseQueryOptions<Avatar>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.avatars.detail(avatarId ?? ''),
    queryFn: () => getAvatar(avatarId!),
    enabled: !!avatarId,
    ...options,
  });
}

/** Create avatar + save ID to localStorage. */
export function useCreateAvatar(options?: UseMutationOptions<string, Error, CreateAvatarParams>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: CreateAvatarParams) => {
      const res = await createAvatar(params);
      const id = res.data.id;
      addAvatarId(id);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.avatars.list() });
    },
    ...options,
  });
}

/** Delete avatar + remove ID from localStorage. */
export function useDeleteAvatar(options?: UseMutationOptions<void, Error, string>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await deleteAvatar(id);
      } finally {
        removeAvatarId(id);
        qc.removeQueries({ queryKey: queryKeys.avatars.detail(id) });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.avatars.list() });
    },
    ...options,
  });
}

/** Update avatar. */
export function useUpdateAvatar(
  options?: UseMutationOptions<Awaited<ReturnType<typeof updateAvatar>>, Error, UpdateAvatarParams>
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateAvatar,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.avatars.all });
      qc.invalidateQueries({ queryKey: queryKeys.avatars.detail(vars.avatarId) });
    },
    ...options,
  });
}

/** Analyze avatar body profile. */
export function useAnalyzeAvatar(
  options?: UseMutationOptions<AnalyzeAvatarResponseDto, Error, { avatarId: string }>
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: analyzeAvatar,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.avatars.detail(vars.avatarId) });
      qc.invalidateQueries({ queryKey: queryKeys.avatars.list() });
    },
    ...options,
  });
}
