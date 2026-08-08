import { toast } from "sonner";

import { cn } from "@/lib/utils";

/** Order/invoice number chip — click to copy. */
export function CopyBadge({
  value,
  className,
  label = "অর্ডার নাম্বার কপি হয়েছে",
}: {
  value: string;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        void navigator.clipboard.writeText(value);
        toast.success(label, { description: value });
      }}
      title="Click to copy"
      className={cn(
        "rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground active:scale-[0.98]",
        className,
      )}
    >
      {value}
    </button>
  );
}
