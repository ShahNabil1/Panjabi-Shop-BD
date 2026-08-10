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
  /** Optional fields never block the "Configured" status of their group. */
  optional?: boolean;
};

export const integrationMeta: Record<
  IntegrationGroup,
  { title: string; description: string; docs: string; fields: IntegrationField[] }
> = {
  r2: {
    title: "Cloudflare R2",
    description: "MEDIA STORAGE - IMAGES, VIDEOS, INVOICE PDF, BANNERS",
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
      {
        key: "CLOUDFLARE_ANALYTICS_API_TOKEN",
        label: "Analytics API Token",
        secret: true,
        optional: true,
        placeholder: "Zone Analytics Read token",
        hint: "Read-only token used to show live image transformation usage.",
      },
    ],
  },
  bulksmsbd: {
    title: "BulkSMSBD",
    description: "AUTOMATIC & DYNAMIC SMS GATEWAY",
    docs: "http://bulksmsbd.net",
    fields: [
      { key: "BULKSMSBD_API_KEY", label: "API Key", secret: true },
      { key: "BULKSMSBD_SENDER_ID", label: "Sender ID", secret: false },
    ],
  },
  bdcourier: {
    title: "BD Courier",
    description: "CUSTOMER COURIER FRAUD CHECK",
    docs: "https://bdcourier.com",
    fields: [{ key: "BDCOURIER_API_KEY", label: "API Key", secret: true }],
  },
};

export const groupKeys = (group: IntegrationGroup) =>
  integrationMeta[group].fields.map((f) => f.key);

/** Keys that must be present for a group to count as configured. */
export const requiredGroupKeys = (group: IntegrationGroup) =>
  integrationMeta[group].fields.filter((f) => !f.optional).map((f) => f.key);
