export type Lang = "bn" | "en";

export const LANG_COOKIE = "site_lang";

export function isLang(value: unknown): value is Lang {
  return value === "bn" || value === "en";
}

export function pick(lang: Lang, bn: string | null | undefined, en: string | null | undefined) {
  const value = lang === "bn" ? (bn ?? en) : (en ?? bn);
  return value ?? "";
}

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toBnDigits(input: string) {
  return input.replace(/\d/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

export function formatNumber(lang: Lang, value: number) {
  const formatted = new Intl.NumberFormat("en-US").format(value);
  return lang === "bn" ? toBnDigits(formatted) : formatted;
}

export function formatPrice(lang: Lang, value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  const rounded = Number.isFinite(amount) ? Math.round(amount) : 0;
  return lang === "bn" ? `৳ ${formatNumber("bn", rounded)}` : `Tk ${formatNumber("en", rounded)}`;
}

export function discountPercent(
  price: number | string | null | undefined,
  compareAt: number | string | null | undefined,
) {
  const p = Number(price ?? 0);
  const c = Number(compareAt ?? 0);
  if (!c || c <= p) return 0;
  return Math.round(((c - p) / c) * 100);
}

export const t = {
  home: { bn: "হোম", en: "Home" },
  categories: { bn: "ক্যাটাগরি", en: "Categories" },
  offers: { bn: "অফার", en: "Offers" },
  faq: { bn: "প্রশ্নোত্তর", en: "FAQ" },
  about: { bn: "আমাদের কথা", en: "About" },
  contact: { bn: "যোগাযোগ", en: "Contact" },
  search: { bn: "খুঁজুন", en: "Search" },
  searchPlaceholder: { bn: "পণ্যের নাম লিখুন...", en: "Search products..." },
  shopNow: { bn: "কেনাকাটা করুন", en: "Shop now" },
  viewAll: { bn: "সব দেখুন", en: "View all" },
  orderNow: { bn: "অর্ডার করুন", en: "Order now" },
  outOfStock: { bn: "স্টক শেষ", en: "Out of stock" },
  inStock: { bn: "স্টকে আছে", en: "In stock" },
  off: { bn: "ছাড়", en: "off" },
  description: { bn: "বিবরণ", en: "Description" },
  specs: { bn: "স্পেসিফিকেশন", en: "Specifications" },
  productFaq: { bn: "এক নজরে", en: "At a glance" },
  related: { bn: "সম্পর্কিত পণ্য", en: "Related products" },
  noProducts: { bn: "এই মুহূর্তে কোনো পণ্য নেই।", en: "No products here right now." },
  sku: { bn: "এসকেইউ", en: "SKU" },
  brand: { bn: "ব্র্যান্ড", en: "Brand" },
  reviews: { bn: "রিভিউ", en: "reviews" },
  cod: { bn: "ক্যাশ অন ডেলিভারি", en: "Cash on delivery" },
  allCategories: { bn: "সব ক্যাটাগরি", en: "All categories" },
  notFoundTitle: { bn: "পেইজটি পাওয়া যায়নি", en: "We couldn't find that page" },
  notFoundBody: {
    bn: "লিংকটি হয়তো বদলে গেছে বা পণ্যটি আর নেই। নিচ থেকে খুঁজে দেখুন।",
    en: "The link may have changed or the product is gone. Try one of these instead.",
  },
  backHome: { bn: "হোমে ফিরুন", en: "Back to home" },
  popular: { bn: "জনপ্রিয় পণ্য", en: "Popular products" },
  results: { bn: "ফলাফল", en: "results" },
  errorTitle: { bn: "কিছু একটা সমস্যা হয়েছে", en: "Something went wrong" },
  errorBody: {
    bn: "পেইজটি লোড করা যায়নি। আবার চেষ্টা করুন।",
    en: "This page could not load. Please try again.",
  },
  tryAgain: { bn: "আবার চেষ্টা করুন", en: "Try again" },
} as const;

export type Dict = typeof t;

export function tr(lang: Lang, key: keyof Dict) {
  return t[key][lang];
}
