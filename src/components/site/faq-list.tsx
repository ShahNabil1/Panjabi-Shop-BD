import { useState } from "react";

import { useLang } from "@/lib/language-context";
import { pick } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type FaqItem = {
  id?: string;
  question_bn: string;
  question_en: string;
  answer_bn: string;
  answer_en: string;
};

export function FaqList({ items, className }: { items: FaqItem[]; className?: string }) {
  const { lang } = useLang();
  const [open, setOpen] = useState<number | null>(0);

  if (items.length === 0) return null;

  return (
    <div className={cn("divide-y divide-border overflow-hidden rounded-lg border border-border bg-card", className)}>
      {items.map((item, i) => {
        const expanded = open === i;
        return (
          <div key={item.id ?? i}>
            <button
              type="button"
              onClick={() => setOpen(expanded ? null : i)}
              aria-expanded={expanded}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 text-left"
            >
              <span className="lp-fat-bn min-w-0 text-[15px] leading-snug text-foreground sm:text-[16px]">
                {pick(lang, item.question_bn, item.question_en)}
              </span>
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  expanded && "rotate-180",
                )}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div
              className="grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none"
              style={{ gridTemplateRows: expanded ? "1fr" : "0fr", opacity: expanded ? 1 : 0 }}
            >
              <div className="overflow-hidden">
                <p className="lp-fat-bn px-4 pb-4 text-sm leading-7 text-foreground/[0.88] sm:text-[15px]">
                  {pick(lang, item.answer_bn, item.answer_en)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
