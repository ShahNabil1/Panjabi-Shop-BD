import { createServerFn } from "@tanstack/react-start";

import {
  fetchCategoryPage,
  fetchFaqs,
  fetchHome,
  fetchLayoutData,
  fetchProduct,
  fetchPromotion,
  fetchPromotionList,
  fetchSearch,
  fetchSubcategoryPage,
} from "./catalog.server";

export const getHomeData = createServerFn({ method: "GET" }).handler(async () => fetchHome());

export const getCategoryPage = createServerFn({ method: "GET" })
  .inputValidator((data: { category: string }) => ({ category: String(data.category) }))
  .handler(async ({ data }) => fetchCategoryPage(data.category));

export const getSubcategoryPage = createServerFn({ method: "GET" })
  .inputValidator((data: { category: string; subcategory: string }) => ({
    category: String(data.category),
    subcategory: String(data.subcategory),
  }))
  .handler(async ({ data }) => fetchSubcategoryPage(data.category, data.subcategory));

export const getProductPage = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data.slug) }))
  .handler(async ({ data }) => fetchProduct(data.slug));

export const getPromotionPage = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data.slug) }))
  .handler(async ({ data }) => fetchPromotion(data.slug));

export const getPromotions = createServerFn({ method: "GET" }).handler(async () =>
  fetchPromotionList(),
);

export const getFaqPage = createServerFn({ method: "GET" }).handler(async () => fetchFaqs());

export const searchProducts = createServerFn({ method: "GET" })
  .inputValidator((data: { q: string }) => ({ q: String(data.q ?? "").slice(0, 80) }))
  .handler(async ({ data }) => fetchSearch(data.q));

export const getLayoutData = createServerFn({ method: "GET" }).handler(async () =>
  fetchLayoutData(),
);
