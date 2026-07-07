import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { patchConfig, readConfig } from "./client";
import type { CodexConfig, CodexConfigPatch } from "./model";

export const CONFIG_QUERY_KEY = ["config"] as const;

export function useConfigData() {
  const queryClient = useQueryClient();
  const configQuery = useQuery({
    queryFn: readConfig,
    queryKey: CONFIG_QUERY_KEY,
  });
  const configMutation = useMutation({
    mutationFn: patchConfig,
    onError() {
      void queryClient.invalidateQueries({ queryKey: CONFIG_QUERY_KEY });
    },
    async onMutate(patch: CodexConfigPatch) {
      await queryClient.cancelQueries({ queryKey: CONFIG_QUERY_KEY });
      const previousConfig = queryClient.getQueryData<CodexConfig>(CONFIG_QUERY_KEY);

      if (previousConfig && patch.modelProvider) {
        queryClient.setQueryData<CodexConfig>(CONFIG_QUERY_KEY, {
          ...previousConfig,
          modelProvider: patch.modelProvider,
        });
      }

      return { previousConfig };
    },
    onSuccess(nextConfig) {
      queryClient.setQueryData(CONFIG_QUERY_KEY, nextConfig);
    },
  });

  return {
    configMutation,
    configQuery,
    isSaving: configMutation.isPending,
    setModelProvider: (modelProvider: string) => {
      configMutation.mutate({ modelProvider });
    },
  };
}
