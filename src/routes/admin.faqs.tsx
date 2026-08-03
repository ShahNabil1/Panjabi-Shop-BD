import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { HelpCircle, Pencil, Trash2, X } from "lucide-react";

import { adminDeleteFaq, adminListFaqs, adminSaveFaq } from "@/lib/admin.functions";
import type { FaqInput } from "@/lib/admin-schema";
import {
  AdminHeading,
  AreaField,
  EmptyState,
  NumberField,
  Panel,
  TextField,
  ToggleField,
} from "@/components/admin/kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/faqs")({
  component: FaqsAdmin,
});

function emptyFaq(): FaqInput {
  return {
    question_bn: "",
    question_en: "",
    answer_bn: "",
    answer_en: "",
    sort_order: 0,
    is_active: true,
  };
}

function toFaqDraft(f: any): FaqInput {
  return {
    ...f,
    question_bn: f.question_bn || f.question_en || "",
    question_en: f.question_bn || f.question_en || "",
    answer_bn: f.answer_bn || f.answer_en || "",
    answer_en: f.answer_bn || f.answer_en || "",
  };
}

function FaqsAdmin() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<FaqInput>(emptyFaq());
  const [openId, setOpenId] = useState<string | null>(null);
  const { data } = useQuery({ queryKey: ["admin", "faqs"], queryFn: () => adminListFaqs() });

  const save = useMutation({
    mutationFn: (input: FaqInput) => adminSaveFaq({ data: input }),
    onSuccess: async () => {
      toast.success("FAQ saved");
      setDraft(emptyFaq());
      await qc.invalidateQueries({ queryKey: ["admin", "faqs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteFaq({ data: { id } }),
    onSuccess: async () => {
      toast.success("Deleted");
      await qc.invalidateQueries({ queryKey: ["admin", "faqs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 pb-16">
      <AdminHeading title="FAQ" description="Questions and answers shown on the homepage and FAQ page." />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Panel className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <HelpCircle className="size-4 text-primary" />
            {draft.id ? "Edit FAQ" : "New FAQ"}
          </h2>
          <TextField
            label="Question"
            value={draft.question_bn}
            onChange={(v) => setDraft({ ...draft, question_bn: v, question_en: v })}
          />
          <AreaField
            label="Answer"
            rows={5}
            value={draft.answer_bn}
            onChange={(v) => setDraft({ ...draft, answer_bn: v, answer_en: v })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField
              label="Sort order"
              value={draft.sort_order}
              onChange={(v) => setDraft({ ...draft, sort_order: v })}
            />
            <ToggleField
              label="Active"
              checked={draft.is_active}
              onChange={(v) => setDraft({ ...draft, is_active: v })}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              disabled={save.isPending}
              onClick={() => save.mutate(draft)}
              className="ig-gradient transition-transform duration-300 hover:scale-[1.02]"
            >
              Save
            </Button>
            {draft.id ? (
              <Button variant="outline" onClick={() => setDraft(emptyFaq())}>
                <X className="mr-1 size-4" />
                Cancel
              </Button>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-0">
          <h2 className="border-b border-border p-4 text-sm font-bold">All questions</h2>
          {(data ?? []).length === 0 ? (
            <div className="p-4">
              <EmptyState title="No FAQs yet" hint="Add your first question on the left." />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {(data ?? []).map((f, i) => {
                const isOpen = openId === f.id;
                return (
                  <li
                    key={f.id}
                    className="admin-rise transition-colors duration-300"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : f.id)}
                      className="group flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors duration-200 hover:bg-primary/5"
                    >
                      <p className="min-w-0 flex-1 truncate font-medium">
                        {f.question_bn || f.question_en}
                      </p>
                      <div className="flex items-center gap-1 opacity-70 transition-opacity duration-200 group-hover:opacity-100">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDraft(toFaqDraft(f));
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Delete this FAQ?")) remove.mutate(f.id);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </button>
                    <div
                      className="grid overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                      style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                    >
                      <div className="overflow-hidden">
                        <p className="px-4 pb-4 text-sm text-muted-foreground">
                          {f.answer_bn || f.answer_en}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
