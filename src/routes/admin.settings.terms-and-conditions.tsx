import { createFileRoute } from "@tanstack/react-router";
import { LegalPageEditor } from "@/components/admin/legal-page-editor";

export const Route = createFileRoute("/admin/settings/terms-and-conditions")({
  head: () => ({ meta: [{ title: "Edit Terms & Conditions — Panjabi Shop BD Admin" }, { name: "description", content: "Edit the Panjabi Shop BD terms and conditions." }, { property: "og:title", content: "Edit Terms & Conditions — Panjabi Shop BD Admin" }, { property: "og:description", content: "Edit the Panjabi Shop BD terms and conditions." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => <LegalPageEditor settingKey="legal_terms" />,
});