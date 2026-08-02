import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { Equipment } from '@shared/schema';
import { deleteEquipment, listEquipment, loadEquipment, saveEquipment } from './adminApi';

/**
 * Query bindings for the admin surface.
 *
 * Unlike the content queries in `src/lib/data.ts`, which read an immutable
 * per-deploy export and therefore never refetch, these read the live system of
 * record and are invalidated after every write. Stale content on a public page
 * is invisible; stale content on the screen you just edited is a bug report.
 */

export const ADMIN_KEYS = {
  equipment: ['admin', 'equipment'] as const,
  entry: (slug: string) => ['admin', 'equipment', slug] as const,
};

export function useAdminEquipment(): UseQueryResult<Equipment[]> {
  return useQuery({
    queryKey: ADMIN_KEYS.equipment,
    queryFn: listEquipment,
    staleTime: 30_000,
  });
}

export function useAdminEntry(slug: string | undefined): UseQueryResult<Equipment | null> {
  return useQuery({
    queryKey: ADMIN_KEYS.entry(slug ?? ''),
    queryFn: () => loadEquipment(slug as string),
    enabled: Boolean(slug),
    staleTime: 30_000,
  });
}

export function useSaveEquipment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: saveEquipment,
    onSuccess: (_result, entry) => {
      void client.invalidateQueries({ queryKey: ADMIN_KEYS.equipment });
      void client.invalidateQueries({ queryKey: ADMIN_KEYS.entry(entry.slug) });
    },
  });
}

export function useDeleteEquipment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteEquipment,
    onSuccess: (_result, slug) => {
      void client.invalidateQueries({ queryKey: ADMIN_KEYS.equipment });
      client.removeQueries({ queryKey: ADMIN_KEYS.entry(slug) });
    },
  });
}
