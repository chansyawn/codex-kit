export type ConfigEntry = {
  key: string;
  valuePreview: string;
};

export type ProjectConfigEntry = {
  path: string;
  trustedLevel?: string;
  values: ConfigEntry[];
};

export type ConfigOverview = {
  global: ConfigEntry[];
  projects: ProjectConfigEntry[];
  sourcePath: string;
};
