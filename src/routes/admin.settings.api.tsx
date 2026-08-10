import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, PlugZap, Trash2, XCircle } from "lucide-react";

import { AdminHeading, Panel, TextField } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import {
  adminListIntegrations,
  adminRemoveIntegration,
  adminSaveIntegration,
  adminTestIntegration,
  type IntegrationGroupState,
  type IntegrationTestResult,
} from "@/lib/integrations.functions";
import {
  API_SECRET_MASK,
  INTEGRATION_GROUPS,
  integrationMeta,
  type IntegrationGroup,
} from "@/lib/integrations-shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/settings/api")({
  component: ApiSettingsAdmin,
});

function SourceChip({ source }: { source: "database" | "environment" | "missing" }) {
  const map = {
    database: { label: "Saved here", cls: "border-emerald-200 bg-emerald-50 text-emerald-900" },
    environment: { label: "From server env", cls: "border-amber-200 bg-amber-50 text-amber-900" },
    missing: { label: "Not set", cls: "border-border bg-muted/50 text-muted-foreground" },
  } as const;
  const item = map[source];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        item.cls,
      )}
    >
      {item.label}
    </span>
  );
}

function GroupCard({
  group,
  state,
  onSaved,
}: {
  group: IntegrationGroup;
  state: IntegrationGroupState | undefined;
  onSaved: () => Promise<void>;
}) {
  const meta = integrationMeta[group];
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<IntegrationTestResult | null>(null);

  useEffect(() => {
    setValues(state?.values ?? {});
  }, [state]);

  const save = useMutation({
    mutationFn: () => adminSaveIntegration({ data: { group, values } }),
    onSuccess: async () => {
      toast.success(`${meta.title} saved`);
      setResult(null);
      await onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => adminRemoveIntegration({ data: { group } }),
    onSuccess: async () => {
      toast.success(`${meta.title} credentials removed`);
      setResult(null);
      await onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const test = useMutation({
    mutationFn: () => adminTestIntegration({ data: { group } }),
    onSuccess: (res) => {
      setResult(res);
      if (res.ok) toast.success(`${meta.title}: ${res.message}`);
      else toast.error(`${meta.title}: ${res.message}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = save.isPending || remove.isPending;

  return (
    <Panel className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="ig-text text-sm font-bold">{meta.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
            state?.configured
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-border bg-muted/50 text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              state?.configured ? "bg-emerald-600" : "bg-muted-foreground",
            )}
          />
          {state?.configured ? "Configured" : "Incomplete"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {meta.fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {field.key}
              </span>
              <SourceChip source={state?.sources[field.key] ?? "missing"} />
            </div>
            <TextField
              label={field.label}
              value={values[field.key] ?? ""}
              placeholder={field.placeholder ?? (field.secret ? "Paste the value" : "")}
              onChange={(v: string) => setValues((prev) => ({ ...prev, [field.key]: v }))}
              {...(field.hint ? { hint: field.hint } : {})}
            />

          </div>
        ))}
      </div>

      {state?.envOnly ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          These values are still coming from server environment variables. Save them here once and
          you no longer need them in Cloudflare env settings.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" disabled={busy} onClick={() => save.mutate()}>
          {save.isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
          Save
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={test.isPending}
          onClick={() => test.mutate()}
        >
          {test.isPending ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <PlugZap className="mr-1.5 size-4" />
          )}
          Test connection
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="text-destructive hover:bg-destructive/10"
          disabled={busy}
          onClick={() => {
            if (!window.confirm(`Remove all ${meta.title} credentials?`)) return;
            remove.mutate();
          }}
        >
          <Trash2 className="mr-1.5 size-4" />
          Remove
        </Button>
      </div>

      {result ? (
        <div
          className={cn(
            "space-y-2 rounded-xl border px-3 py-3 text-xs",
            result.ok
              ? "border-emerald-200 bg-emerald-50/70"
              : "border-rose-200 bg-rose-50/70 text-rose-900",
          )}
        >
          <div className="flex items-center gap-2 font-bold">
            {result.ok ? (
              <CheckCircle2 className="size-4 text-emerald-600" />
            ) : (
              <XCircle className="size-4 text-rose-600" />
            )}
            {result.message}
            <span className="ml-auto font-medium text-muted-foreground">
              {new Date(result.checkedAt).toLocaleTimeString()}
            </span>
          </div>
          {result.details.length ? (
            <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
              {result.details.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="ig-text truncate font-semibold">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}

function ApiSettingsAdmin() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "integrations"],
    queryFn: () => adminListIntegrations(),
  });

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["admin", "integrations"] });
  };

  return (
    <div className="space-y-6 pb-16">
      <AdminHeading
        title="API & Integrations"
        description="Storage, SMS and courier-check credentials — stored securely in the database, editable any time."
      />
      <p className="rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Secret values are never shown again after saving — the {API_SECRET_MASK} placeholder means
        the stored value stays untouched. Clearing a field and saving deletes that value.
      </p>

      {INTEGRATION_GROUPS.map((group) => (
        <GroupCard
          key={group}
          group={group}
          state={q.data?.find((row) => row.group === group)}
          onSaved={refresh}
        />
      ))}
    </div>
  );
}
