import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { ApiError, ListResponse, WithId } from '@/types';

export function useCrud<T extends WithId>(
  base: string,
  queryKey: string = base
) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [queryKey] });
  const msg = (e: unknown, fallback: string) => {
    const err = e as ApiError;
    if (err?.details?.length) return;
    toast.error(err?.message || fallback);
  };

  const listQuery = useQuery({
    queryKey: [queryKey],
    queryFn: async () => (await api.get<ListResponse<T>>(`/${base}`)).data,
  });

  const create = useMutation({
    mutationFn: async (body: Partial<T>) =>
      (await api.post(`/${base}`, body)).data,
    onSuccess: () => {
      invalidate();
      toast.success('Created');
    },
    onError: (e) => msg(e, 'Create failed'),
  });

  const update = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<T> }) =>
      (await api.put(`/${base}/${id}`, body)).data,
    onSuccess: () => {
      invalidate();
      toast.success('Saved');
    },
    onError: (e) => msg(e, 'Update failed'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/${base}/${id}`)).data,
    onSuccess: () => {
      invalidate();
      toast.success('Deleted');
    },
    onError: (e) => msg(e, 'Delete failed'),
  });

  return {
    items: (listQuery.data?.data ?? []) as T[],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    refetch: listQuery.refetch,
    create,
    update,
    remove,
  };
}
