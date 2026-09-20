import { createFileRoute } from "@tanstack/react-router";
import { LegalPageEditor } from "@/components/admin/legal-page-editor";

export const Route = createFileRoute("/admin/settings/privacy-policy")({
  head: () => ({ meta: [{ title: "Edit Privacy Policy — Panjabi Shop BD Admin" }, { name: "description", content: "Edit the Panjabi Shop BD privacy policy." }, { property: "og:title", content: "Edit Privacy Policy — Panjabi Shop BD Admin" }, { property: "og:description", content: "Edit the Panjabi Shop BD privacy policy." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => <LegalPageEditor settingKey="legal_privacy" />,
});