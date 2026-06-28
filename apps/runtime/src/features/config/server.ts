import type { ConfigOverview } from "./model";

export type GetConfigOverviewOptions = {
  codexHome: string;
};

export async function getConfigOverview(
  options: GetConfigOverviewOptions,
): Promise<ConfigOverview> {
  return {
    global: [
      {
        key: "model",
        valuePreview: "gpt-5-codex",
      },
      {
        key: "approval_policy",
        valuePreview: "never",
      },
    ],
    projects: [
      {
        path: "/path/to/project",
        trustedLevel: "trusted",
        values: [
          {
            key: "trusted_level",
            valuePreview: "trusted",
          },
        ],
      },
    ],
    sourcePath: `${options.codexHome}/config.toml`,
  };
}
