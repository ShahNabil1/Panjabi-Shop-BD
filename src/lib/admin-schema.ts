import { z } from "zod";

export const orderStatuses = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const promotionTypes = ["offer", "featured", "flash", "new_arrival"] as const;

const uuid = z.string().uuid();
const optText = z
  .string()
  .trim()
  .max(20000)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

export const idSchema = z.object({ id: uuid });

export const orderStatusSchema = z.object({
  id: uuid,
  status: z.enum(orderStatuses),
});

export const orderListSchema = z.object({
  status: z.enum(orderStatuses).optional(),
  search: z.string().trim().max(120).optional(),
});

export const categorySchema = z.object({
  id: uuid.optional(),
  slug: z.string().trim().min(1).max(80),
  name_bn: z.string().trim().min(1).max(120),
  name_en: z.string().trim().min(1).max(120),
  description_bn: optText,
  description_en: optText,
  image_url: optText,
  meta_title: optText,
  meta_description: optText,
  sort_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

export const subcategorySchema = categorySchema.extend({
  category_id: uuid,
});

export const productImageSchema = z.object({
  url: z.string().trim().min(1).max(1000),
  alt_bn: optText,
  alt_en: optText,
  sort_order: z.number().int().min(0).default(0),
});

export const productVariantSchema = z.object({
  group_name_bn: z.string().trim().min(1).max(80),
  group_name_en: z.string().trim().min(1).max(80),
  value_bn: z.string().trim().min(1).max(80),
  value_en: z.string().trim().min(1).max(80),
  sku: optText,
  price_delta: z.number().default(0),
  stock: z.number().int().min(0).default(0),
  sort_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

export const specSchema = z.object({
  label_bn: z.string().trim().max(120).default(""),
  label_en: z.string().trim().max(120).default(""),
  value_bn: z.string().trim().max(500).default(""),
  value_en: z.string().trim().max(500).default(""),
});

export const productFaqSchema = z.object({
  question_bn: z.string().trim().max(300).default(""),
  question_en: z.string().trim().max(300).default(""),
  answer_bn: z.string().trim().max(2000).default(""),
  answer_en: z.string().trim().max(2000).default(""),
});

export const productSchema = z.object({
  id: uuid.optional(),
  slug: z.string().trim().min(1).max(90),
  category_id: uuid,
  subcategory_id: uuid.nullable().default(null),
  name_bn: z.string().trim().min(1).max(200),
  name_en: z.string().trim().min(1).max(200),
  short_description_bn: optText,
  short_description_en: optText,
  description_bn: optText,
  description_en: optText,
  specs: z.array(specSchema).default([]),
  faq: z.array(productFaqSchema).default([]),
  price: z.number().min(0),
  compare_at_price: z.number().min(0).nullable().default(null),
  stock: z.number().int().min(0).default(0),
  sku: optText,
  brand: optText,
  badge_bn: optText,
  badge_en: optText,
  meta_title: optText,
  meta_description: optText,
  og_image_url: optText,
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  sort_order: z.number().int().min(0).default(0),
  images: z.array(productImageSchema).default([]),
  variants: z.array(productVariantSchema).default([]),
});

export const promotionSchema = z.object({
  id: uuid.optional(),
  slug: z.string().trim().min(1).max(90),
  title_bn: z.string().trim().min(1).max(200),
  title_en: z.string().trim().min(1).max(200),
  subtitle_bn: optText,
  subtitle_en: optText,
  type: z.enum(promotionTypes).default("offer"),
  banner_url: optText,
  meta_title: optText,
  meta_description: optText,
  starts_at: optText,
  ends_at: optText,
  sort_order: z.number().int().min(0).default(0),
  show_on_home: z.boolean().default(true),
  is_active: z.boolean().default(true),
  product_ids: z.array(uuid).default([]),
});

export const landingPageSchema = z.object({
  id: uuid.optional(),
  product_id: uuid,
  slug: z.string().trim().min(1).max(90),
  headline_bn: optText,
  headline_en: optText,
  subheadline_bn: optText,
  subheadline_en: optText,
  meta_title: optText,
  meta_description: optText,
  og_image_url: optText,
  is_active: z.boolean().default(true),
  bullets: z
    .array(z.object({ bn: z.string().trim().max(300), en: z.string().trim().max(300) }))
    .default([]),
});

export const faqSchema = z.object({
  id: uuid.optional(),
  question_bn: z.string().trim().min(1).max(300),
  question_en: z.string().trim().min(1).max(300),
  answer_bn: z.string().trim().min(1).max(4000),
  answer_en: z.string().trim().min(1).max(4000),
  sort_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

export const settingSchema = z.object({
  key: z.string().trim().min(1).max(60),
  value: z.record(z.string(), z.unknown()),
});

export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type SubcategoryInput = z.infer<typeof subcategorySchema>;
export type PromotionInput = z.infer<typeof promotionSchema>;
export type LandingPageInput = z.infer<typeof landingPageSchema>;
export type FaqInput = z.infer<typeof faqSchema>;
