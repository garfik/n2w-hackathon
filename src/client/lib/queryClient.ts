import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

export const queryKeys = {
  avatars: {
    all: ['avatars'] as const,
    list: () => [...queryKeys.avatars.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.avatars.all, 'detail', id] as const,
  },
  outfits: {
    all: ['outfits'] as const,
    list: (avatarId: string) => [...queryKeys.outfits.all, 'list', avatarId] as const,
    detail: (id: string) => [...queryKeys.outfits.all, 'detail', id] as const,
  },
  garments: {
    all: ['garments'] as const,
    list: () => [...queryKeys.garments.all, 'list'] as const,
  },
} as const;
