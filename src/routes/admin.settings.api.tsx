import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  CheckCircle2,
  Loader2,
  Lock,
  Pencil,
  PlugZap,
  Trash2,
  TriangleAlert,
  XCircle,
} from "lucide-react";

import { AdminHeading, Panel, TextField } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  adminListIntegrations,
  adminR2DiscardMigration,
  adminR2FinishMigration,
  adminR2MigrateBatch,
  adminR2MigrationState,
  adminRemoveIntegration,
  adminSaveIntegration,
  adminTestIntegration,
  type IntegrationGroupState,
  type IntegrationTestResult,
} from "@/lib/integrations.functions";
import {
  
  INTEGRATION_GROUPS,
  integrationMeta,
  type IntegrationGroup,
} from "@/lib/integrations-shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/settings/api")({
  component: ApiSettingsAdmin,
});

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
  const [savedSnapshot, setSavedSnapshot] = useState<string>("{}");
  const [result, setResult] = useState<IntegrationTestResult | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    const next = state?.values ?? {};
    setValues(next);
    setSavedSnapshot(JSON.stringify(next));
    setResult(state?.lastTest ?? null);
    setUnlocked(false);
  }, [state]);

  const locked = Boolean(state?.configured) && !unlocked;
  const isDirty = JSON.stringify(values) !== savedSnapshot;


  const save = useMutation({
    mutationFn: () => adminSaveIntegration({ data: { group, values } }),
    onSuccess: async () => {
      toast.success(`${meta.title} saved`);
      setSavedSnapshot(JSON.stringify(values));
      setUnlocked(false);
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
    onSuccess: async (res) => {
      setResult(res);
      if (res.ok) toast.success(`${meta.title}: ${res.message}`);
      else toast.error(`${meta.title}: ${res.message}`);
      await onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = save.isPending || remove.isPending;

  const verified = Boolean(result?.ok) && !isDirty;
  const status = !state?.configured
    ? { label: "Incomplete", cls: "border-border bg-muted/50 text-muted-foreground", dot: "bg-muted-foreground" }
    : verified
      ? {
          label: "Verified",
          cls: "border-emerald-200 bg-emerald-50 text-emerald-900",
          dot: "bg-emerald-600",
        }
      : result && !result.ok
        ? { label: "Failed", cls: "border-rose-200 bg-rose-50 text-rose-900", dot: "bg-rose-600" }
        : {
            label: "Not verified",
            cls: "border-amber-200 bg-amber-50 text-amber-900",
            dot: "bg-amber-500",
          };

  return (
    <Panel className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="ig-text text-sm font-bold">{meta.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {result
              ? `Last checked ${new Date(result.checkedAt).toLocaleString("en-US", {
                  timeZone: "Asia/Dhaka",
                })}`
              : "Not verified yet"}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
            status.cls,
          )}
        >
          <span className={cn("size-1.5 rounded-full", status.dot)} />
          {status.label}
        </span>
      </div>

      {locked ? (
        <p className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-[11px] font-medium text-muted-foreground">
          <Lock className="size-3.5" />
          Credentials are locked. Click Edit to change them.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {meta.fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {field.key}
            </span>
            <TextField
              label={field.label}
              value={values[field.key] ?? ""}
              disabled={locked}
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
        {locked ? (
          <>
            <Button type="button" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1.5 size-4" />
              Edit credentials
            </Button>
            <AlertDialog open={editOpen} onOpenChange={setEditOpen}>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
                    <TriangleAlert className="size-5" />
                    Edit {meta.title} credentials?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    These credentials are live. A wrong or incomplete value will immediately break
                    this integration — uploads, SMS or courier calls can stop working across the
                    whole site. Only continue if you have the correct values at hand, and run “Test
                    connection” right after saving.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="rounded-xl bg-amber-600 text-white hover:bg-amber-700"
                    onClick={(e) => {
                      e.preventDefault();
                      setEditOpen(false);
                      setUnlocked(true);
                    }}
                  >
                    I understand, let me edit
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <>
            <Button type="button" disabled={busy || !isDirty} onClick={() => save.mutate()}>
              {save.isPending ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : !isDirty ? (
                <CheckCircle2 className="mr-1.5 size-4" />
              ) : null}
              {!isDirty && !save.isPending ? "Saved" : "Save"}
            </Button>
            {state?.configured ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setValues(state?.values ?? {});
                  setUnlocked(false);
                }}
              >
                Cancel
              </Button>
            ) : null}
          </>
        )}
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
        {locked ? null : (
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
        )}
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

function R2MigrationCard() {
  const qc = useQueryClient();
  const state = useQuery({
    queryKey: ["admin", "r2-migration"],
    queryFn: () => adminR2MigrationState(),
  });
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [progress, setProgress] = useState({ copied: 0, skipped: 0, failed: 0 });

  if (!state.data?.pending || !state.data.from || !state.data.to) return null;
  const { from, to } = state.data;

  const run = async () => {
    setRunning(true);
    setLog([]);
    setProgress({ copied: 0, skipped: 0, failed: 0 });
    let offset = 0;
    let copied = 0;
    let skipped = 0;
    let failed = 0;
    let total = 0;
    const errors: string[] = [];
    try {
      for (let page = 0; page < 500; page += 1) {
        const res: Awaited<ReturnType<typeof adminR2MigrateBatch>> = await adminR2MigrateBatch({
          data: { offset },
        });
        copied += res.copied;
        skipped += res.skipped;
        failed += res.failed;
        total = res.total;
        errors.push(...res.errors);
        setProgress({ copied, skipped, failed });
        setLog((prev) => [
          `Batch ${page + 1}: ${res.copied} copied, ${res.skipped} already there${
            res.failed ? `, ${res.failed} failed` : ""
          } · ${res.total} total referenced`,
          ...prev,
        ]);
        offset = res.nextOffset ?? -1;
        if (offset < 0) break;
      }
      if (failed > 0) {
        toast.error(`${failed} file(s) failed — run migrate again to retry them.`);
        setLog((prev) => [...errors.slice(0, 5), ...prev]);
        return;
      }
      const done = await adminR2FinishMigration();
      toast.success(`Migration complete — ${copied} file(s) copied, ${done.rewritten} link(s) updated.`);
      await qc.invalidateQueries({ queryKey: ["admin", "r2-migration"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Migration failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Panel className="space-y-4 border-amber-200 bg-amber-50/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="ig-text flex items-center gap-2 text-sm font-bold">
            <ArrowRightLeft className="size-4 text-amber-700" />
            Bucket change detected
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            All images, invoices and videos referenced in the database still point to the old
            bucket. Migrate copies those referenced files into the new bucket and updates every
            stored link. The old token only needs read permission; bucket listing is not required.
          </p>
        </div>
      </div>

      <dl className="grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">From</dt>
          <dd className="ig-text truncate font-semibold">{from.bucket}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">To</dt>
          <dd className="ig-text truncate font-semibold">{to.bucket}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Old URL</dt>
          <dd className="ig-text truncate font-semibold">{from.publicBaseUrl}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">New URL</dt>
          <dd className="ig-text truncate font-semibold">{to.publicBaseUrl}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" disabled={running} onClick={run}>
          {running ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <ArrowRightLeft className="mr-1.5 size-4" />
          )}
          {running ? "Migrating…" : "Migrate media"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={running}
          className="text-destructive hover:bg-destructive/10"
          onClick={async () => {
            if (!window.confirm("Skip migration and forget the old bucket?")) return;
            await adminR2DiscardMigration();
            await qc.invalidateQueries({ queryKey: ["admin", "r2-migration"] });
          }}
        >
          Skip
        </Button>
        {running || progress.copied || progress.skipped || progress.failed ? (
          <span className="text-xs font-semibold text-muted-foreground">
            {progress.copied} copied · {progress.skipped} skipped · {progress.failed} failed
          </span>
        ) : null}
      </div>

      {log.length ? (
        <div className="max-h-40 space-y-1 overflow-auto rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-[11px] text-muted-foreground">
          {log.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
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
    await qc.invalidateQueries({ queryKey: ["admin", "r2-migration"] });
  };


  return (
    <div className="space-y-6 pb-16">
      <AdminHeading
        title="API & Integrations"
        description="Storage, SMS and courier-check credentials — stored securely in the database, editable any time."
      />

      <R2MigrationCard />

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
