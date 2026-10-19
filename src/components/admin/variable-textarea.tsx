import { useEffect, useMemo, useRef, useState } from "react";
import { Braces } from "lucide-react";

import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  name: "Customer name",
  order_no: "Order number",
  amount: "Order total",
  receipt_url: "Receipt link",
  phone: "Customer phone",
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  variables: string[];
  /** When given, inserts the real value instead of the {{token}} (live preview). */
  values?: Record<string, string>;
  label?: string;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  className?: string;
};

/**
 * Textarea with variable chips that insert at the caret, plus a "/" command
 * menu (arrow keys + Enter, tap on touch). Shared by SMS templates and the
 * order SMS composer.
 */
export function VariableTextarea({
  value,
  onChange,
  variables,
  values,
  label = "Variables — tap to insert, or type /",
  disabled,
  rows = 6,
  maxLength,
  placeholder,
  className,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const caret = useRef<{ start: number; end: number }>({ start: value.length, end: value.length });
  const [slash, setSlash] = useState<{ at: number; query: string } | null>(null);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const insertText = (v: string) => (values ? (values[v] ?? "") : `{{${v}}}`);

  const matches = useMemo(() => {
    if (!slash) return [];
    const q = slash.query.toLowerCase();
    return variables.filter(
      (v) => v.toLowerCase().includes(q) || (LABELS[v] ?? "").toLowerCase().includes(q),
    );
  }, [slash, variables]);

  useEffect(() => setActive(0), [slash?.query]);
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const remember = () => {
    const el = ref.current;
    if (el) caret.current = { start: el.selectionStart, end: el.selectionEnd };
  };

  const detectSlash = (text: string, pos: number) => {
    const before = text.slice(0, pos);
    const m = before.match(/(^|\s)\/(\w*)$/);
    const q = m?.[2] ?? "";
    setSlash(m ? { at: pos - q.length - 1, query: q } : null);
  };

  const replaceRange = (start: number, end: number, insert: string) => {
    let next = value.slice(0, start) + insert + value.slice(end);
    if (maxLength && next.length > maxLength) next = next.slice(0, maxLength);
    onChange(next);
    const pos = Math.min(start + insert.length, next.length);
    caret.current = { start: pos, end: pos };
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const insertAtCaret = (v: string) => {
    if (disabled) return;
    const { start, end } = caret.current;
    replaceRange(Math.min(start, value.length), Math.min(end, value.length), insertText(v));
  };

  const pickSlash = (v: string) => {
    if (!slash) return;
    const end = slash.at + 1 + slash.query.length;
    setSlash(null);
    replaceRange(slash.at, end, insertText(v));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!slash || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const pick = matches[active];
      if (pick) pickSlash(pick);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSlash(null);
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {variables.map((v) => (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertAtCaret(v)}
              title={values ? `Inserts: ${values[v] || "(empty)"}` : LABELS[v]}
              className="inline-flex touch-manipulation items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors hover:border-primary/40 hover:text-primary active:scale-95 disabled:pointer-events-none disabled:opacity-50"
            >
              <Braces className="size-3" />
              {`{{${v}}}`}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <textarea
          ref={ref}
          value={value}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            caret.current = { start: e.target.selectionStart, end: e.target.selectionEnd };
            detectSlash(e.target.value, e.target.selectionStart);
          }}
          onSelect={remember}
          onKeyUp={remember}
          onClick={remember}
          onKeyDown={onKeyDown}
          onBlur={() => {
            remember();
            setTimeout(() => setSlash(null), 150);
          }}
          className={cn(
            "w-full rounded-xl border border-border/80 bg-background/70 p-3 text-sm outline-none focus:border-primary disabled:opacity-70",
            className,
          )}
        />
        {slash && matches.length > 0 ? (
          <div
            ref={listRef}
            role="listbox"
            className="absolute inset-x-2 top-full z-50 mt-1 max-h-60 overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"
          >
            {matches.map((v, i) => (
              <button
                key={v}
                type="button"
                role="option"
                aria-selected={i === active}
                data-idx={i}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => pickSlash(v)}
                className={cn(
                  "flex w-full touch-manipulation items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm",
                  i === active ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                )}
              >
                <span className="font-mono text-xs font-semibold">{`{{${v}}}`}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {values ? values[v] || "—" : (LABELS[v] ?? "")}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
