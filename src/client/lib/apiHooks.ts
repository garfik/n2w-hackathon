import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  listOutfits,
  getOutfit,
  createOutfit,
  generateScore,
  generateTryon,
  listGarments,
  getGarment,
  detectGarments,
  createGarmentsFromDetections,
  updateGarment,
  deleteGarment,
  type CreateOutfitParams,
  type CreateOutfitResult,
  type ScoreResult,
  type TryonResult,
  type GarmentListItem,
  type GarmentDetail,
  type ListGarmentsParams,
  type DetectGarmentsResult,
  type UpdateGarmentParams,
} from '@client/lib/n2wApi';
import type { CreateGarmentsBody } from '@shared/dtos/garment';
import { queryKeys } from '@client/lib/queryClient';

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

export function useCreateOutfit(
  options?: UseMutationOptions<CreateOutfitResult, Error, CreateOutfitParams>
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createOutfit,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.outfits.list(vars.avatarId) });
    },
    ...options,
  });
}

export function useGenerateScore(options?: UseMutationOptions<ScoreResult, Error, string>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: generateScore,
    onSuccess: (_, outfitId) => {
      qc.invalidateQueries({ queryKey: queryKeys.outfits.detail(outfitId) });
    },
    ...options,
  });
}

export function useGenerateTryon(options?: UseMutationOptions<TryonResult, Error, string>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: generateTryon,
    onSuccess: (_, outfitId) => {
      qc.invalidateQueries({ queryKey: queryKeys.outfits.detail(outfitId) });
    },
    ...options,
  });
}

// --- Garments ---

export function useGarmentsList(
  params?: ListGarmentsParams,
  options?: Omit<UseQueryOptions<GarmentListItem[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKeys.garments.list(), params?.category ?? '', params?.search ?? ''],
    queryFn: () => listGarments(params),
    ...options,
  });
}

export function useGarment(
  garmentId: string | undefined,
  options?: Omit<UseQueryOptions<GarmentDetail>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.garments.detail(garmentId ?? ''),
    queryFn: () => getGarment(garmentId!),
    enabled: !!garmentId,
    ...options,
  });
}

export function useDetectGarments(
  options?: UseMutationOptions<DetectGarmentsResult, Error, string>
) {
  return useMutation({
    mutationFn: (uploadId: string) => detectGarments(uploadId),
    ...options,
  });
}

export function useCreateGarmentsFromDetections(
  options?: UseMutationOptions<{ createdIds: string[] }, Error, CreateGarmentsBody>
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createGarmentsFromDetections,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.garments.all });
    },
    ...options,
  });
}

export function useUpdateGarment(
  options?: UseMutationOptions<GarmentDetail, Error, UpdateGarmentParams>
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateGarment,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.garments.all });
      qc.invalidateQueries({ queryKey: queryKeys.garments.detail(vars.garmentId) });
    },
    ...options,
  });
}

export function useDeleteGarment(
  options?: UseMutationOptions<{ deleted: boolean }, Error, string>
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteGarment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.garments.all });
    },
    ...options,
  });
}
