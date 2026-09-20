import { createFileRoute } from "@tanstack/react-router";
import { LegalPageEditor } from "@/components/admin/legal-page-editor";

export const Route = createFileRoute("/admin/settings/return-policy")({
  head: () => ({ meta: [{ title: "Edit Return Policy — Panjabi Shop BD Admin" }, { name: "description", content: "Edit the Panjabi Shop BD return policy." }, { property: "og:title", content: "Edit Return Policy — Panjabi Shop BD Admin" }, { property: "og:description", content: "Edit the Panjabi Shop BD return policy." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => <LegalPageEditor settingKey="legal_returns" />,
});