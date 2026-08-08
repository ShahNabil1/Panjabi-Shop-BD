import { z } from "zod";

export const DELIVERY_AREAS = ["inside_dhaka", "outside_dhaka"] as const;
export type DeliveryArea = (typeof DELIVERY_AREAS)[number];

export const orderLineSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().default(null),
  quantity: z.number().int().min(1).max(99),
  comboSelections: z.array(z.object({
    itemId: z.string().uuid(),
    variantId: z.string().uuid(),
  })).max(50).default([]),
});

export const placeOrderSchema = z.object({
  customerName: z.string().trim().min(2).max(80),
  customerPhone: z
    .string()
    .trim()
    .regex(/^01[3-9]\d{8}$/, "Invalid Bangladeshi mobile number"),
  addressLine: z.string().trim().min(6).max(300),
  division: z.string().trim().min(2).max(60),
  district: z.string().trim().min(2).max(60),
  upazila: z.string().trim().min(2).max(80),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  couponCode: z.string().trim().max(40).optional().or(z.literal("")),
  source: z.enum(["website", "landing"]).default("website"),
  items: z.array(orderLineSchema).min(1).max(30),
});


export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export const orderLookupSchema = z.object({
  orderNumber: z.string().trim().min(4).max(40),
  phone: z.string().trim().min(6).max(20),
});

/** Partial checkout capture — only the phone number is strictly required. */
export const incompleteOrderSchema = z.object({
  customerPhone: z
    .string()
    .trim()
    .regex(/^01[3-9]\d{8}$/, "Invalid Bangladeshi mobile number"),
  customerName: z.string().trim().max(80).optional().default(""),
  addressLine: z.string().trim().max(300).optional().default(""),
  division: z.string().trim().max(60).optional().default(""),
  district: z.string().trim().max(60).optional().default(""),
  upazila: z.string().trim().max(80).optional().default(""),
  note: z.string().trim().max(500).optional().default(""),
  source: z.enum(["website", "landing"]).default("website"),
  items: z.array(orderLineSchema).min(1).max(30),
});

export type IncompleteOrderInput = z.infer<typeof incompleteOrderSchema>;
