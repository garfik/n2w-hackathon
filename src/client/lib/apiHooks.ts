import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  listAvatars,
  getAvatar,
  deleteAvatar,
  updateAvatar,
  createAvatar,
  analyzeAvatar,
  listOutfits,
  getOutfit,
  type Avatar,
  type CreateAvatarParams,
  type UpdateAvatarParams,
} from '@client/lib/n2wApi';
import type { AnalyzeAvatarResponseDto } from '@shared/dtos/avatar';
import { queryKeys } from '@client/lib/queryClient';

// --- Avatars ---

export function useAvatars(options?: Omit<UseQueryOptions<Avatar[]>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.avatars.list(),
    queryFn: listAvatars,
    ...options,
  });
}

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

export function useDeleteAvatar(
  options?: UseMutationOptions<{ deletedOutfitsCount: number }, Error, string>
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAvatar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.avatars.all });
    },
    ...options,
  });
}

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

export function useCreateAvatar(
  options?: UseMutationOptions<Awaited<ReturnType<typeof createAvatar>>, Error, CreateAvatarParams>
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAvatar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.avatars.all });
    },
    ...options,
  });
}

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

// --- Outfits ---

export function useOutfitsList(
  avatarId: string | undefined,
  options?: Omit<UseQueryOptions<Awaited<ReturnType<typeof listOutfits>>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.outfits.list(avatarId ?? ''),
    queryFn: () => listOutfits(avatarId!),
    enabled: !!avatarId,
    ...options,
  });
}

export function useOutfit(
  outfitId: string | undefined,
  options?: Omit<UseQueryOptions<Awaited<ReturnType<typeof getOutfit>>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.outfits.detail(outfitId ?? ''),
    queryFn: () => getOutfit(outfitId!),
    enabled: !!outfitId,
    ...options,
  });
}
