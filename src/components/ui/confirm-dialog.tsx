import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, LogOut, Trash2 } from "lucide-react";

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
import { cn } from "@/lib/utils";

export type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` = destructive red action, `brand` = primary brand action. */
  tone?: "danger" | "brand";
  /** Icon shown in the header badge. Defaults to trash (danger) / warning (brand). */
  icon?: "trash" | "warning" | "logout";
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Site-wide confirmation dialog. Replaces window.confirm everywhere:
 *   const confirm = useConfirm();
 *   if (await confirm({ title: "Delete this FAQ?", tone: "danger" })) remove();
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    setOpen(false);
    resolver.current?.(value);
    resolver.current = null;
  }, []);

  const tone = options?.tone ?? "danger";
  const isDanger = tone === "danger";

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AlertDialog open={open} onOpenChange={(next) => (next ? setOpen(true) : settle(false))}>
        <AlertDialogContent className="max-w-md overflow-hidden rounded-2xl border-border/70 p-0 shadow-2xl">
          <div
            className={cn(
              "h-1 w-full",
              isDanger ? "bg-destructive" : "bg-primary",
            )}
          />
          <div className="p-6">
            <AlertDialogHeader className="flex-row items-start gap-4 space-y-0 text-left">
              <span
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-full",
                  isDanger ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
                )}
              >
                {isDanger ? (
                  <Trash2 className="size-5" />
                ) : (
                  <AlertTriangle className="size-5" />
                )}
              </span>
              <div className="min-w-0 space-y-1.5">
                <AlertDialogTitle className="text-base font-bold leading-snug">
                  {options?.title}
                </AlertDialogTitle>
                {options?.description ? (
                  <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
                    {options.description}
                  </AlertDialogDescription>
                ) : null}
              </div>
            </AlertDialogHeader>

            <AlertDialogFooter className="mt-6 gap-2">
              <AlertDialogCancel
                onClick={() => settle(false)}
                className="rounded-lg transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                {options?.cancelLabel ?? "Cancel"}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => settle(true)}
                className={cn(
                  "rounded-lg transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]",
                  isDanger
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {options?.confirmLabel ?? (isDanger ? "Delete" : "Confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx;
}
