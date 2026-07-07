import { FileCogIcon } from "lucide-react";
import type { ReactNode } from "react";

import { useRuntimeI18n } from "@/features/settings/i18n-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/select";

import type { CodexConfig } from "./model";
import { useConfigData } from "./use-config-data";

type ConfigFieldDefinition = {
  id: "modelProvider";
  render: (config: CodexConfig, options: ConfigFieldRenderOptions) => ReactNode;
};

type ConfigFieldRenderOptions = {
  disabled: boolean;
  onModelProviderChange: (modelProvider: string) => void;
};

const CONFIG_FIELDS: ConfigFieldDefinition[] = [
  {
    id: "modelProvider",
    render: (config, options) => (
      <ModelProviderField
        config={config}
        disabled={options.disabled}
        onChange={options.onModelProviderChange}
      />
    ),
  },
];

export function ConfigPage() {
  const { t } = useRuntimeI18n();
  const { configMutation, configQuery, isSaving, setModelProvider } = useConfigData();
  const config = configQuery.data;
  const parseErrorMessage =
    config?.parseStatus.ok === false ? config.parseStatus.message : undefined;
  const hasParseError = Boolean(parseErrorMessage);
  const isControlDisabled = configQuery.isLoading || isSaving || hasParseError;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <FileCogIcon aria-hidden="true" />
            {t.dashboard_nav_config()}
          </div>
          <h1 className="mt-3 text-2xl font-semibold">{t.config_page_title()}</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">{t.config_page_detail()}</p>
        </div>
        {isSaving ? (
          <span className="bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs">
            {t.config_save_pending()}
          </span>
        ) : null}
      </header>

      {configQuery.isError ? (
        <ConfigStatusMessage message={t.config_load_error()} tone="error" />
      ) : null}
      {configMutation.isError ? (
        <ConfigStatusMessage message={t.config_save_error()} tone="error" />
      ) : null}
      {hasParseError ? (
        <ConfigStatusMessage
          message={`${t.config_parse_error()}: ${parseErrorMessage}`}
          tone="error"
        />
      ) : null}

      <section className="border-border bg-card rounded-lg border p-4">
        {configQuery.isLoading && !config ? (
          <div className="text-muted-foreground text-sm">{t.config_loading()}</div>
        ) : null}
        {config ? (
          <div className="divide-border divide-y">
            {CONFIG_FIELDS.map((field) => (
              <div key={field.id} className="py-4 first:pt-0 last:pb-0">
                {field.render(config, {
                  disabled: isControlDisabled,
                  onModelProviderChange: setModelProvider,
                })}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {config ? (
        <p className="text-muted-foreground text-xs">
          {t.config_file_path_label()}: <code>{config.configPath}</code>
        </p>
      ) : null}
    </div>
  );
}

function ModelProviderField({
  config,
  disabled,
  onChange,
}: {
  config: CodexConfig;
  disabled: boolean;
  onChange: (modelProvider: string) => void;
}) {
  const { t } = useRuntimeI18n();

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)] md:items-center">
      <div className="min-w-0">
        <label className="text-sm font-medium" htmlFor="model-provider-select">
          {t.config_model_provider_label()}
        </label>
        <p className="text-muted-foreground mt-1 text-sm">{t.config_model_provider_detail()}</p>
      </div>
      <Select
        disabled={disabled}
        items={config.providers.map((provider) => ({
          label: provider.label,
          value: provider.id,
        }))}
        onValueChange={(value) => {
          if (typeof value === "string" && value !== config.modelProvider) {
            onChange(value);
          }
        }}
        value={config.modelProvider}
      >
        <SelectTrigger id="model-provider-select" aria-label={t.config_model_provider_label()}>
          <SelectValue placeholder={t.config_model_provider_placeholder()} />
        </SelectTrigger>
        <SelectContent>
          {config.providers.map((provider) => (
            <SelectItem key={provider.id} value={provider.id}>
              {provider.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ConfigStatusMessage({ message, tone }: { message: string; tone: "error" }) {
  return (
    <div
      className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm"
      data-tone={tone}
    >
      {message}
    </div>
  );
}
