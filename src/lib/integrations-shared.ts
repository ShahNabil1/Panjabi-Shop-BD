/** Shared (client-safe) metadata for the admin API credentials page. */

export const API_SECRET_MASK = "••••••••";

export const INTEGRATION_GROUPS = ["r2", "bulksmsbd", "bdcourier"] as const;
export type IntegrationGroup = (typeof INTEGRATION_GROUPS)[number];

export type IntegrationField = {
  key: string;
  label: string;
  secret: boolean;
  placeholder?: string;
  hint?: string;
};

export const integrationMeta: Record<
  IntegrationGroup,
  { title: string; description: string; docs: string; fields: IntegrationField[] }
> = {
  r2: {
    title: "Cloudflare R2",
    description: "Media storage — product images, banners and invoice PDFs.",
    docs: "https://dash.cloudflare.com/?to=/:account/r2",
    fields: [
      { key: "R2_ACCOUNT_ID", label: "Account ID", secret: false },
      { key: "R2_ACCESS_KEY_ID", label: "Access Key ID", secret: true },
      { key: "R2_SECRET_ACCESS_KEY", label: "Secret Access Key", secret: true },
      { key: "R2_BUCKET", label: "Bucket name", secret: false },
      {
        key: "R2_PUBLIC_BASE_URL",
        label: "Public base URL",
        secret: false,
        placeholder: "https://cdn.example.com",
      },
    ],
  },
  bulksmsbd: {
    title: "BulkSMSBD",
    description: "Order SMS gateway — automatic and manual messages.",
    docs: "http://bulksmsbd.net",
    fields: [
      { key: "BULKSMSBD_API_KEY", label: "API Key", secret: true },
      { key: "BULKSMSBD_SENDER_ID", label: "Sender ID", secret: false },
    ],
  },
  bdcourier: {
    title: "BD Courier",
    description: "Customer courier fraud check used across order pages.",
    docs: "https://bdcourier.com",
    fields: [{ key: "BDCOURIER_API_KEY", label: "API Key", secret: true }],
  },
};

export const groupKeys = (group: IntegrationGroup) =>
  integrationMeta[group].fields.map((f) => f.key);
