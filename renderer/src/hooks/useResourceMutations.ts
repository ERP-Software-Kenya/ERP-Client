import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface MutableResourceApi<T> {
  create(body: Partial<T>): Promise<T>;
  update(id: string, body: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
}

export function useResourceMutations<T extends { id: string }>(
  api: MutableResourceApi<T>,
  queryKey: string,
  label: string,
) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [queryKey] });

  const createMutation = useMutation({
    mutationFn: (body: Partial<T>) => api.create(body),
    onSuccess: () => {
      toast.success(`${label} created`);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message || `Failed to create ${label.toLowerCase()}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<T> }) => api.update(id, body),
    onSuccess: () => {
      toast.success(`${label} updated`);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message || `Failed to update ${label.toLowerCase()}`),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.remove(id),
    onSuccess: () => {
      toast.success(`${label} deleted`);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message || `Failed to delete ${label.toLowerCase()}`),
  });

  return { createMutation, updateMutation, removeMutation };
}
