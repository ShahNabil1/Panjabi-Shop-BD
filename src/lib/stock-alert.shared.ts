export const alertKinds = [
  "out_of_stock",
  "low_stock",
  "negative_stock",
  "no_reorder_rule",
  "combo_blocked",
  "dead_stock",
  "po_overdue",
] as const;
export type AlertKind = (typeof alertKinds)[number];

export type AlertSeverity = "critical" | "warning" | "info";

export const alertLabels: Record<AlertKind, string> = {
  out_of_stock: "Out of stock",
  low_stock: "Low stock",
  negative_stock: "Negative stock",
  no_reorder_rule: "No reorder rule",
  combo_blocked: "Combo not buildable",
  dead_stock: "Dead stock",
  po_overdue: "PO overdue",
};

export const alertHints: Record<AlertKind, string> = {
  out_of_stock: "সেল-এ থাকা পণ্য, কিন্তু হাতে স্টক শূন্য — বিজ্ঞাপন চললে টাকা নষ্ট হচ্ছে।",
  low_stock: "রিঅর্ডার পয়েন্টে নেমে এসেছে — এখনই চালান দেওয়ার সময়।",
  negative_stock: "লেজারে হিসাব শূন্যের নিচে — অডিট বা ভুল এন্ট্রি ঠিক করা দরকার।",
  no_reorder_rule: "চলমান পণ্যে রিঅর্ডার পয়েন্ট বসানো নেই, তাই আগাম সতর্কতা আসবে না।",
  combo_blocked: "কম্বো অ্যাকটিভ, কিন্তু ভিতরের কোনো আইটেম শেষ — একটাও বানানো যাচ্ছে না।",
  dead_stock: "অনেকদিন কোনো নড়াচড়া নেই — টাকা আটকে আছে।",
  po_overdue: "অর্ডার করা চালান প্রত্যাশিত তারিখ পার করেছে, এখনো রিসিভ হয়নি।",
};

export type StockAlert = {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  name: string;
  variantLabel: string | null;
  sku: string;
  detail: string;
  onHand: number | null;
  reorderPoint: number | null;
  suggestQty: number;
  valueAtRisk: number;
  link: string;
};

export type StockAlertReport = {
  generatedAt: string;
  counts: { critical: number; warning: number; info: number; total: number };
  byKind: Array<{ kind: AlertKind; count: number }>;
  capitalAtRisk: number;
  alerts: StockAlert[];
};
