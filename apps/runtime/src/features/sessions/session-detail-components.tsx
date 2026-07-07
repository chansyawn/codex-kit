import Codex from "@lobehub/icons/es/Codex";
import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon, RefreshCwIcon } from "lucide-react";
import { isValidElement, type ReactNode } from "react";

import type {
  SessionCommandAction,
  SessionFileUpdateChange,
  SessionSource,
  SessionThread,
  SessionThreadItem,
  SessionThreadStatus,
  SessionTurn,
  SessionUserInput,
  SessionWebSearchAction,
} from "@/features/sessions/model";
import { useRuntimeI18n } from "@/features/settings/i18n-provider";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/components/collapsible";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemTitle,
} from "@/ui/components/item";
import { Skeleton } from "@/ui/components/skeleton";
import { formatIntegerNumber } from "@/ui/lib/number-format";
import { cn } from "@/ui/lib/utils";

type RuntimeMessages = ReturnType<typeof useRuntimeI18n>["t"];

type MetadataRow = {
  label: string;
  value: unknown;
};

export type SessionDetailViewProps = {
  isOpeningInCodex: boolean;
  isRefreshing: boolean;
  onOpenInCodex: () => void;
  onRefresh: () => void;
  thread: SessionThread;
};

export function SessionDetailView({
  isOpeningInCodex,
  isRefreshing,
  onOpenInCodex,
  onRefresh,
  thread,
}: SessionDetailViewProps) {
  const { locale, t } = useRuntimeI18n();
  const title = thread.name || thread.preview || thread.id;

  return (
    <div className="grid gap-5">
      <header className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" render={<Link to="/sessions" />}>
            <ArrowLeftIcon data-icon="inline-start" />
            {t.session_detail_back_to_sessions()}
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCwIcon
                data-icon="inline-start"
                className={cn(isRefreshing && "animate-spin")}
              />
              {t.refresh()}
            </Button>
            <Button variant="outline" disabled={isOpeningInCodex} onClick={onOpenInCodex}>
              <Codex.Color aria-hidden="true" data-icon="inline-start" size={16} />
              {t.session_action_open_in_codex()}
            </Button>
          </div>
        </div>

        <section className="grid gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold break-words">{title}</h1>
              {thread.preview && thread.preview !== title ? (
                <p className="text-muted-foreground mt-1 text-sm break-words">{thread.preview}</p>
              ) : null}
            </div>
            <ThreadStatusBadge status={thread.status} />
          </div>
          <MetadataGrid rows={createThreadMetadataRows(thread, locale, t)} />
        </section>
      </header>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{t.session_detail_timeline_title()}</h2>
          <Badge variant="secondary" className="rounded-md">
            {t.session_detail_turn_count({
              count: formatIntegerNumber(thread.turns.length, locale),
            })}
          </Badge>
        </div>
        {thread.turns.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t.session_detail_empty_turns()}</p>
        ) : (
          <div className="grid gap-5">
            {thread.turns.map((turn, index) => (
              <TurnSection key={turn.id} index={index} turn={turn} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function SessionDetailSkeleton() {
  return (
    <div className="grid gap-5">
      <div className="flex justify-between gap-3">
        <Skeleton className="h-8 w-36" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <div className="grid gap-3">
        <Skeleton className="h-6 w-2/5" />
        <Skeleton className="h-4 w-3/5" />
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      </div>
      <div className="grid gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-36 w-full" />
        ))}
      </div>
    </div>
  );
}

export function SessionDetailError({ message }: { message: string }) {
  return <p className="text-destructive text-sm">{message}</p>;
}

function TurnSection({ index, turn }: { index: number; turn: SessionTurn }) {
  const { locale, t } = useRuntimeI18n();
  const metadataRows: MetadataRow[] = [
    { label: t.session_detail_turn_id(), value: <CodeValue>{turn.id}</CodeValue> },
    { label: t.session_detail_turn_status(), value: formatTurnStatus(turn.status, t) },
    { label: t.session_detail_items_view(), value: turn.itemsView },
    { label: t.session_detail_started_at(), value: formatUnixSeconds(turn.startedAt, locale, t) },
    {
      label: t.session_detail_completed_at(),
      value: formatUnixSeconds(turn.completedAt, locale, t),
    },
    { label: t.session_detail_duration(), value: formatDuration(turn.durationMs, t) },
  ];

  return (
    <section className="grid gap-3 border-t pt-5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          {t.session_detail_turn_title({
            index: formatIntegerNumber(index + 1, locale),
          })}
        </h3>
        <Badge variant="outline" className="rounded-md">
          {formatTurnStatus(turn.status, t)}
        </Badge>
      </div>
      <MetadataGrid rows={metadataRows} />
      {turn.error ? <JsonBlock label={t.session_detail_turn_error()} value={turn.error} /> : null}
      {turn.items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t.session_detail_empty_items()}</p>
      ) : (
        <ItemGroup className="gap-3">
          {turn.items.map((item) => (
            <ThreadItemView key={item.id} item={item} />
          ))}
        </ItemGroup>
      )}
    </section>
  );
}

function ThreadItemView({ item }: { item: SessionThreadItem }) {
  const { t } = useRuntimeI18n();

  return (
    <Item variant="outline" className="block rounded-lg p-4">
      <ItemHeader className="mb-3 flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <ItemTitle className="text-sm font-semibold break-words">
            {getItemTypeLabel(item.type, t)}
          </ItemTitle>
          <ItemDescription className="font-mono text-xs break-all">{item.id}</ItemDescription>
        </div>
        <Badge variant="secondary" className="rounded-md font-mono">
          {item.type}
        </Badge>
      </ItemHeader>
      <ItemContent className="grid gap-3">{renderThreadItemContent(item, t)}</ItemContent>
      <ItemFooter className="mt-3 block">
        <RawJson value={item} />
      </ItemFooter>
    </Item>
  );
}

function renderThreadItemContent(item: SessionThreadItem, t: RuntimeMessages): ReactNode {
  switch (item.type) {
    case "userMessage":
      return (
        <div className="grid gap-2">
          {item.clientId ? (
            <InfoLine label={t.session_detail_client_id()} value={item.clientId} />
          ) : null}
          {item.content.map((content, index) => (
            <UserInputView key={index} input={content} />
          ))}
        </div>
      );
    case "hookPrompt":
      return (
        <div className="grid gap-2">
          {item.fragments.map((fragment) => (
            <div key={fragment.hookRunId} className="grid gap-1">
              <InfoLine label={t.session_detail_hook_run_id()} value={fragment.hookRunId} />
              <TextBlock value={fragment.text} />
            </div>
          ))}
        </div>
      );
    case "agentMessage":
      return (
        <div className="grid gap-2">
          {item.phase ? <InfoLine label={t.session_detail_phase()} value={item.phase} /> : null}
          <TextBlock value={item.text} />
          {item.memoryCitation ? (
            <JsonBlock label={t.session_detail_memory_citation()} value={item.memoryCitation} />
          ) : null}
        </div>
      );
    case "plan":
      return <TextBlock value={item.text} />;
    case "reasoning":
      return (
        <div className="grid gap-3">
          <StringList label={t.session_detail_reasoning_summary()} values={item.summary} />
          <StringList label={t.session_detail_reasoning_content()} values={item.content} />
        </div>
      );
    case "commandExecution":
      return (
        <div className="grid gap-3">
          <MetadataGrid
            rows={[
              { label: t.session_detail_command(), value: <CodeValue>{item.command}</CodeValue> },
              { label: t.session_detail_cwd(), value: item.cwd },
              { label: t.session_detail_status(), value: item.status },
              { label: t.session_detail_source(), value: item.source },
              {
                label: t.session_detail_process_id(),
                value: item.processId ?? t.session_detail_empty_value(),
              },
              {
                label: t.session_detail_exit_code(),
                value: formatNullableNumber(item.exitCode, t),
              },
              { label: t.session_detail_duration(), value: formatDuration(item.durationMs, t) },
            ]}
          />
          <CommandActions actions={item.commandActions} />
          {item.aggregatedOutput ? (
            <PreBlock label={t.session_detail_command_output()} value={item.aggregatedOutput} />
          ) : null}
        </div>
      );
    case "fileChange":
      return (
        <div className="grid gap-3">
          <InfoLine label={t.session_detail_status()} value={item.status} />
          {item.changes.map((change, index) => (
            <FileChangeView key={`${change.path}:${index}`} change={change} />
          ))}
        </div>
      );
    case "mcpToolCall":
      return (
        <div className="grid gap-3">
          <MetadataGrid
            rows={[
              { label: t.session_detail_server(), value: item.server },
              { label: t.session_detail_tool(), value: item.tool },
              { label: t.session_detail_status(), value: item.status },
              {
                label: t.session_detail_plugin_id(),
                value: item.pluginId ?? t.session_detail_empty_value(),
              },
              { label: t.session_detail_duration(), value: formatDuration(item.durationMs, t) },
            ]}
          />
          <JsonBlock label={t.session_detail_arguments()} value={item.arguments} />
          {item.appContext ? (
            <JsonBlock label={t.session_detail_app_context()} value={item.appContext} />
          ) : null}
          {item.result ? <JsonBlock label={t.session_detail_result()} value={item.result} /> : null}
          {item.error ? <JsonBlock label={t.session_detail_error()} value={item.error} /> : null}
        </div>
      );
    case "dynamicToolCall":
      return (
        <div className="grid gap-3">
          <MetadataGrid
            rows={[
              {
                label: t.session_detail_namespace(),
                value: item.namespace ?? t.session_detail_empty_value(),
              },
              { label: t.session_detail_tool(), value: item.tool },
              { label: t.session_detail_status(), value: item.status },
              { label: t.session_detail_success(), value: formatBoolean(item.success, t) },
              { label: t.session_detail_duration(), value: formatDuration(item.durationMs, t) },
            ]}
          />
          <JsonBlock label={t.session_detail_arguments()} value={item.arguments} />
          {item.contentItems ? (
            <JsonBlock label={t.session_detail_content_items()} value={item.contentItems} />
          ) : null}
        </div>
      );
    case "collabAgentToolCall":
      return (
        <div className="grid gap-3">
          <MetadataGrid
            rows={[
              { label: t.session_detail_tool(), value: item.tool },
              { label: t.session_detail_status(), value: item.status },
              { label: t.session_detail_sender_thread_id(), value: item.senderThreadId },
              {
                label: t.session_detail_receiver_thread_ids(),
                value: item.receiverThreadIds.join(", "),
              },
              {
                label: t.session_detail_model(),
                value: item.model ?? t.session_detail_empty_value(),
              },
              {
                label: t.session_detail_reasoning_effort(),
                value: item.reasoningEffort ?? t.session_detail_empty_value(),
              },
            ]}
          />
          {item.prompt ? <TextBlock label={t.session_detail_prompt()} value={item.prompt} /> : null}
          <JsonBlock label={t.session_detail_agents_states()} value={item.agentsStates} />
        </div>
      );
    case "subAgentActivity":
      return (
        <MetadataGrid
          rows={[
            { label: t.session_detail_kind(), value: item.kind },
            { label: t.session_detail_agent_thread_id(), value: item.agentThreadId },
            { label: t.session_detail_agent_path(), value: item.agentPath },
          ]}
        />
      );
    case "webSearch":
      return (
        <div className="grid gap-3">
          <InfoLine label={t.session_detail_query()} value={item.query} />
          {item.action ? <WebSearchActionView action={item.action} /> : null}
        </div>
      );
    case "imageView":
      return <InfoLine label={t.session_detail_path()} value={item.path} />;
    case "sleep":
      return (
        <InfoLine label={t.session_detail_duration()} value={formatDuration(item.durationMs, t)} />
      );
    case "imageGeneration":
      return (
        <div className="grid gap-3">
          <MetadataGrid
            rows={[
              { label: t.session_detail_status(), value: item.status },
              {
                label: t.session_detail_saved_path(),
                value: item.savedPath ?? t.session_detail_empty_value(),
              },
            ]}
          />
          {item.revisedPrompt ? (
            <TextBlock label={t.session_detail_revised_prompt()} value={item.revisedPrompt} />
          ) : null}
          <TextBlock label={t.session_detail_result()} value={item.result} />
        </div>
      );
    case "enteredReviewMode":
    case "exitedReviewMode":
      return <TextBlock label={t.session_detail_review()} value={item.review} />;
    case "contextCompaction":
      return (
        <p className="text-muted-foreground text-sm">{t.session_detail_context_compaction()}</p>
      );
    default:
      return <p className="text-muted-foreground text-sm">{t.session_detail_unknown_item()}</p>;
  }
}

function UserInputView({ input }: { input: SessionUserInput }) {
  const { t } = useRuntimeI18n();

  switch (input.type) {
    case "text":
      return <TextBlock value={input.text} />;
    case "image":
      return (
        <MetadataGrid
          rows={[
            { label: t.session_detail_type(), value: input.type },
            { label: t.session_detail_url(), value: input.url },
            {
              label: t.session_detail_detail(),
              value: input.detail ?? t.session_detail_empty_value(),
            },
          ]}
        />
      );
    case "localImage":
    case "skill":
    case "mention":
      return (
        <MetadataGrid
          rows={[
            { label: t.session_detail_type(), value: input.type },
            {
              label: t.session_detail_name(),
              value: "name" in input ? input.name : t.session_detail_empty_value(),
            },
            { label: t.session_detail_path(), value: input.path },
          ]}
        />
      );
  }
}

function CommandActions({ actions }: { actions: SessionCommandAction[] }) {
  const { t } = useRuntimeI18n();
  if (actions.length === 0) return null;

  return (
    <div className="grid gap-2">
      <h4 className="text-muted-foreground text-xs font-medium">
        {t.session_detail_command_actions()}
      </h4>
      <div className="grid gap-2">
        {actions.map((action, index) => (
          <JsonBlock key={index} label={formatJsonLabel(action.type)} value={action} />
        ))}
      </div>
    </div>
  );
}

function FileChangeView({ change }: { change: SessionFileUpdateChange }) {
  const { t } = useRuntimeI18n();

  return (
    <div className="grid gap-2 rounded-md border p-3">
      <MetadataGrid
        rows={[
          { label: t.session_detail_path(), value: change.path },
          { label: t.session_detail_kind(), value: change.kind },
        ]}
      />
      <PreBlock label={t.session_detail_diff()} value={change.diff} />
    </div>
  );
}

function WebSearchActionView({ action }: { action: SessionWebSearchAction }) {
  const { t } = useRuntimeI18n();

  switch (action.type) {
    case "search":
      return (
        <MetadataGrid
          rows={[
            { label: t.session_detail_action(), value: action.type },
            {
              label: t.session_detail_query(),
              value: action.query ?? t.session_detail_empty_value(),
            },
            {
              label: t.session_detail_queries(),
              value: action.queries?.join(", ") ?? t.session_detail_empty_value(),
            },
          ]}
        />
      );
    case "openPage":
      return (
        <MetadataGrid
          rows={[
            { label: t.session_detail_action(), value: action.type },
            { label: t.session_detail_url(), value: action.url ?? t.session_detail_empty_value() },
          ]}
        />
      );
    case "findInPage":
      return (
        <MetadataGrid
          rows={[
            { label: t.session_detail_action(), value: action.type },
            { label: t.session_detail_url(), value: action.url ?? t.session_detail_empty_value() },
            {
              label: t.session_detail_pattern(),
              value: action.pattern ?? t.session_detail_empty_value(),
            },
          ]}
        />
      );
    case "other":
      return <InfoLine label={t.session_detail_action()} value={action.type} />;
  }
}

function createThreadMetadataRows(
  thread: SessionThread,
  locale: string,
  t: RuntimeMessages,
): MetadataRow[] {
  return [
    { label: t.session_detail_thread_id(), value: <CodeValue>{thread.id}</CodeValue> },
    { label: t.session_detail_session_id(), value: <CodeValue>{thread.sessionId}</CodeValue> },
    { label: t.session_detail_forked_from_id(), value: formatOptional(thread.forkedFromId, t) },
    { label: t.session_detail_parent_thread_id(), value: formatOptional(thread.parentThreadId, t) },
    { label: t.session_detail_created_at(), value: formatUnixSeconds(thread.createdAt, locale, t) },
    { label: t.session_detail_updated_at(), value: formatUnixSeconds(thread.updatedAt, locale, t) },
    { label: t.session_detail_recency_at(), value: formatUnixSeconds(thread.recencyAt, locale, t) },
    { label: t.session_detail_cwd(), value: thread.cwd },
    { label: t.session_detail_model_provider(), value: thread.modelProvider },
    { label: t.session_detail_cli_version(), value: thread.cliVersion },
    { label: t.session_detail_source(), value: formatSessionSource(thread.source) },
    { label: t.session_detail_thread_source(), value: formatOptional(thread.threadSource, t) },
    { label: t.session_detail_ephemeral(), value: formatBoolean(thread.ephemeral, t) },
    { label: t.session_detail_agent_nickname(), value: formatOptional(thread.agentNickname, t) },
    { label: t.session_detail_agent_role(), value: formatOptional(thread.agentRole, t) },
    { label: t.session_detail_git_sha(), value: formatOptional(thread.gitInfo?.sha ?? null, t) },
    {
      label: t.session_detail_git_branch(),
      value: formatOptional(thread.gitInfo?.branch ?? null, t),
    },
    {
      label: t.session_detail_git_origin(),
      value: formatOptional(thread.gitInfo?.originUrl ?? null, t),
    },
    { label: t.session_detail_path(), value: formatOptional(thread.path, t) },
  ];
}

function MetadataGrid({ rows }: { rows: MetadataRow[] }) {
  return (
    <dl className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0 rounded-md border px-3 py-2">
          <dt className="text-muted-foreground text-xs">{row.label}</dt>
          <dd className="mt-1 min-w-0 text-sm break-words">
            <DisplayValue value={row.value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ThreadStatusBadge({ status }: { status: SessionThreadStatus }) {
  const { t } = useRuntimeI18n();
  const isActive = status.type === "active";

  return (
    <Badge variant={isActive ? "default" : "secondary"} className="rounded-md">
      {formatThreadStatus(status, t)}
    </Badge>
  );
}

function InfoLine({ label, value }: { label: string; value: unknown }) {
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="break-words">
        <DisplayValue value={value} />
      </span>
    </p>
  );
}

function DisplayValue({ value }: { value: unknown }) {
  const { t } = useRuntimeI18n();

  if (isValidElement(value)) return value;
  if (value === null || value === undefined || value === "") {
    return <>{t.session_detail_empty_value()}</>;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <>{String(value)}</>;
  }

  return <code className="font-mono text-xs whitespace-pre-wrap">{formatRawJson(value)}</code>;
}

function TextBlock({ label, value }: { label?: string; value: string }) {
  return (
    <div className="grid gap-1">
      {label ? <h4 className="text-muted-foreground text-xs font-medium">{label}</h4> : null}
      <p className="text-sm break-words whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function StringList({ label, values }: { label: string; values: string[] }) {
  const { t } = useRuntimeI18n();

  return (
    <div className="grid gap-1">
      <h4 className="text-muted-foreground text-xs font-medium">{label}</h4>
      {values.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t.session_detail_empty_value()}</p>
      ) : (
        <ul className="grid gap-1">
          {values.map((value, index) => (
            <li key={index} className="text-sm break-words whitespace-pre-wrap">
              {value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PreBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <h4 className="text-muted-foreground text-xs font-medium">{label}</h4>
      <pre className="bg-muted max-h-72 overflow-auto rounded-md p-3 font-mono text-xs whitespace-pre">
        {value}
      </pre>
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return <PreBlock label={label} value={formatRawJson(value)} />;
}

function RawJson({ value }: { value: unknown }) {
  const { t } = useRuntimeI18n();

  return (
    <Collapsible render={<div className="grid gap-2" />}>
      <CollapsibleTrigger className="text-muted-foreground hover:text-foreground text-xs font-medium">
        {t.session_detail_raw_json()}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="bg-muted max-h-96 overflow-auto rounded-md p-3 font-mono text-xs whitespace-pre">
          {formatRawJson(value)}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}

function CodeValue({ children }: { children: ReactNode }) {
  return <code className="font-mono text-xs break-all">{children}</code>;
}

function formatThreadStatus(status: SessionThreadStatus, t: RuntimeMessages): string {
  if (status.type === "active") {
    const flags = status.activeFlags.length > 0 ? `: ${status.activeFlags.join(", ")}` : "";

    return `${t.session_detail_status_active()}${flags}`;
  }

  if (status.type === "idle") return t.session_detail_status_idle();
  if (status.type === "notLoaded") return t.session_detail_status_not_loaded();

  return t.session_detail_status_system_error();
}

function formatTurnStatus(status: SessionTurn["status"], t: RuntimeMessages): string {
  if (status === "completed") return t.session_detail_turn_status_completed();
  if (status === "failed") return t.session_detail_turn_status_failed();
  if (status === "inProgress") return t.session_detail_turn_status_in_progress();

  return t.session_detail_turn_status_interrupted();
}

function getItemTypeLabel(type: SessionThreadItem["type"], t: RuntimeMessages): string {
  switch (type) {
    case "agentMessage":
      return t.session_detail_item_agent_message();
    case "collabAgentToolCall":
      return t.session_detail_item_collab_agent_tool_call();
    case "commandExecution":
      return t.session_detail_item_command_execution();
    case "contextCompaction":
      return t.session_detail_item_context_compaction();
    case "dynamicToolCall":
      return t.session_detail_item_dynamic_tool_call();
    case "enteredReviewMode":
      return t.session_detail_item_entered_review_mode();
    case "exitedReviewMode":
      return t.session_detail_item_exited_review_mode();
    case "fileChange":
      return t.session_detail_item_file_change();
    case "hookPrompt":
      return t.session_detail_item_hook_prompt();
    case "imageGeneration":
      return t.session_detail_item_image_generation();
    case "imageView":
      return t.session_detail_item_image_view();
    case "mcpToolCall":
      return t.session_detail_item_mcp_tool_call();
    case "plan":
      return t.session_detail_item_plan();
    case "reasoning":
      return t.session_detail_item_reasoning();
    case "sleep":
      return t.session_detail_item_sleep();
    case "subAgentActivity":
      return t.session_detail_item_sub_agent_activity();
    case "userMessage":
      return t.session_detail_item_user_message();
    case "webSearch":
      return t.session_detail_item_web_search();
  }
}

function formatUnixSeconds(value: number | null, locale: string, t: RuntimeMessages): string {
  if (value === null) return t.session_detail_empty_value();

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value * 1000));
}

function formatDuration(value: number | null, t: RuntimeMessages): string {
  if (value === null) return t.session_detail_empty_value();
  if (value < 1000) return `${Math.round(value)} ms`;

  const totalSeconds = Math.round(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function formatNullableNumber(value: number | null, t: RuntimeMessages): string {
  return value === null ? t.session_detail_empty_value() : String(value);
}

function formatOptional(value: string | null | undefined, t: RuntimeMessages): ReactNode {
  return value ? value : t.session_detail_empty_value();
}

function formatBoolean(value: boolean | null, t: RuntimeMessages): string {
  if (value === null) return t.session_detail_empty_value();

  return value ? t.session_detail_yes() : t.session_detail_no();
}

function formatSessionSource(source: SessionSource): string {
  if (typeof source === "string") return source;
  if ("custom" in source) return source.custom;

  return formatRawJson(source);
}

function formatJsonLabel(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  return formatRawJson(value);
}

function formatRawJson(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? "";
}
