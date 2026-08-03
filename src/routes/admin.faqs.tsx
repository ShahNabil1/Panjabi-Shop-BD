import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { adminDeleteFaq, adminListFaqs, adminSaveFaq } from "@/lib/admin.functions";
import type { FaqInput } from "@/lib/admin-schema";
import {
  AdminHeading,
  AreaField,
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

function FaqsAdmin() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<FaqInput>(emptyFaq());
  const { data } = useQuery({ queryKey: ["admin", "faqs"], queryFn: () => adminListFaqs() });

  const save = useMutation({
    mutationFn: (input: FaqInput) => adminSaveFaq({ data: input }),
    onSuccess: async () => {
      toast.success("সেভ হয়েছে");
      setDraft(emptyFaq());
      await qc.invalidateQueries({ queryKey: ["admin", "faqs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteFaq({ data: { id } }),
    onSuccess: async () => {
      toast.success("মুছে ফেলা হয়েছে");
      await qc.invalidateQueries({ queryKey: ["admin", "faqs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 pb-16">
      <AdminHeading title="FAQ" description="হোমপেইজ ও FAQ পেইজে দেখানো প্রশ্নোত্তর।" />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="space-y-4">
          <h2 className="text-sm font-bold">{draft.id ? "FAQ এডিট" : "নতুন FAQ"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="প্রশ্ন (বাংলা)"
              value={draft.question_bn}
              onChange={(v) => setDraft({ ...draft, question_bn: v })}
            />
            <TextField
              label="Question (English)"
              value={draft.question_en}
              onChange={(v) => setDraft({ ...draft, question_en: v })}
            />
          </div>
          <AreaField
            label="উত্তর (বাংলা)"
            rows={4}
            value={draft.answer_bn}
            onChange={(v) => setDraft({ ...draft, answer_bn: v })}
          />
          <AreaField
            label="Answer (English)"
            rows={4}
            value={draft.answer_en}
            onChange={(v) => setDraft({ ...draft, answer_en: v })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField
              label="সর্ট অর্ডার"
              value={draft.sort_order}
              onChange={(v) => setDraft({ ...draft, sort_order: v })}
            />
            <ToggleField
              label="অ্যাক্টিভ"
              checked={draft.is_active}
              onChange={(v) => setDraft({ ...draft, is_active: v })}
            />
          </div>
          <div className="flex gap-2">
            <Button disabled={save.isPending} onClick={() => save.mutate(draft)}>
              সেভ করুন
            </Button>
            {draft.id ? (
              <Button variant="outline" onClick={() => setDraft(emptyFaq())}>
                বাতিল
              </Button>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-0">
          <h2 className="border-b border-border p-4 text-sm font-bold">তালিকা</h2>
          <ul className="divide-y divide-border">
            {(data ?? []).map((f) => (
              <li key={f.id} className="flex items-center gap-2 px-4 py-3 text-sm">
                <p className="min-w-0 flex-1 truncate">{f.question_bn}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDraft(f as unknown as FaqInput)}
                >
                  এডিট
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm("মুছে ফেলবেন?")) remove.mutate(f.id);
                  }}
                >
                  মুছুন
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
