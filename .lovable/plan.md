# ই-কমার্স ওয়েবসাইট — ফেজ ১: ফাউন্ডেশন

Supabase (ডেটা) + Cloudflare R2 (মিডিয়া) + TanStack Start (ফুল SSR) এর উপর একটা সম্পূর্ণ ডায়নামিক, মোবাইল-ফার্স্ট স্টোর। এই ফেজে ডেটা মডেল, ডিজাইন সিস্টেম আর পাবলিক ব্রাউজিং পেইজগুলো দাঁড় করাবো। কার্ট/চেকআউট/ল্যান্ডিং পেইজ/অ্যাডমিন প্যানেল পরের ফেজে — কিন্তু স্কিমা আজই সেগুলোর জন্য প্রস্তুত থাকবে।

## ডিজাইন সিস্টেম

- **ফন্ট**: বাংলা টেক্সটে SolaimanLipi (self-hosted woff2), ইংরেজিতে Times New Roman। CSS `font-family` স্ট্যাকে বাংলা গ্লিফের জন্য `unicode-range` দিয়ে অটো-স্প্লিট — একই লাইনে বাংলা-ইংরেজি মিশলেও ঠিক ফন্ট পড়বে। এক্সসেপশন লাগলে ইউটিলিটি ক্লাস (`.font-en`, `.font-bn`)।
- **লুক**: জেনেরিক AI চেহারা এড়াতে — পার্পল/ইন্ডিগো গ্রেডিয়েন্ট নয়, Inter/Poppins নয়। একটা সংযত, রিটেইল-গ্রেড প্যালেট (নিউট্রাল বেস + একটি সিগনেচার অ্যাকসেন্ট), শার্প কার্ড, বাস্তব প্রোডাক্ট ফটো-কেন্দ্রিক লেআউট, সংযত মোশন।
- সব কালার/শ্যাডো/রেডিয়াস `src/styles.css`-এ সিমান্টিক টোকেন হিসেবে; কম্পোনেন্টে হার্ডকোড রঙ নয়। লাইট+ডার্ক দুটোই।
- মোবাইল-ফার্স্ট: বটম-শিট ফিল্টার, স্টিকি অ্যাড-টু-কার্ট বার, টাচ-ফ্রেন্ডলি টার্গেট।

## ডেটাবেস (Supabase migration)

- `categories` — name_bn/name_en, slug (unique), image, sort_order, SEO ফিল্ড
- `subcategories` — category_id, name_bn/name_en, slug (category-এর ভিতরে unique), SEO ফিল্ড
- `products` — subcategory_id, name_bn/name_en, slug (unique), short/long description (bn+en), price, compare_at_price, stock, sku, is_active, badge, rating fields
- `product_variants` — product_id, name, value, sku, price_delta, stock
- `product_images` — product_id, r2_key, alt_bn/alt_en, sort_order
- `product_seo` — meta_title, meta_description, og_image, canonical, schema_json (product টেবিলেই ইনলাইন রাখব, আলাদা টেবিল নয়)
- `landing_pages` — product_id, slug, hero/section কনটেন্ট (JSONB), is_active
- `promotions` — title_bn/en, type (offer/featured/flash), starts_at, ends_at, sort_order
- `promotion_products` — promotion_id, product_id (এক্সিস্টিং প্রোডাক্ট সিলেক্ট করে সেকশন বানানোর জন্য)
- `orders` + `order_items` — COD ফ্লো: নাম, ফোন, ঠিকানা, ডেলিভারি এরিয়া, status, invoice_r2_key
- `site_settings` — হেডার/হিরো/FAQ/ফুটার কনটেন্ট
- `faqs` — question_bn/en, answer_bn/en, sort_order
- `profiles` + `user_roles` (`app_role` enum) + `has_role()` security-definer ফাংশন — অ্যাডমিন প্যানেলের ভিত্তি

**অ্যাক্সেস নিয়ম**: পাবলিক (লগইন ছাড়া) শুধু অ্যাক্টিভ ক্যাটাগরি/প্রোডাক্ট/অফার/FAQ পড়তে পারবে। অর্ডার যে কেউ তৈরি করতে পারবে (গেস্ট চেকআউট), কিন্তু পড়তে/এডিট করতে পারবে শুধু অ্যাডমিন। প্রোডাক্ট/ক্যাটাগরি/অফার লেখা-মোছা শুধু অ্যাডমিন। প্রতিটা টেবিলে RLS + GRANT।

## রাউট স্ট্রাকচার ও স্লাগ

```text
/                              হোম
/c/$category                   ক্যাটাগরি
/c/$category/$subcategory      সাব-ক্যাটাগরি
/p/$product                    প্রোডাক্ট পেইজ (গ্লোবাল ইউনিক স্লাগ)
/offers/$promotion             অফার সেকশন
/faq  /about  /contact
```

- প্রোডাক্ট স্লাগ গ্লোবালি ইউনিক ও ছোট — ক্যাটাগরি পাথে নেস্ট করব না, ফলে প্রোডাক্ট ক্যাটাগরি বদলালেও URL ভাঙবে না।
- স্লাগ অটো-জেনারেট: বাংলা নাম থেকে ট্রান্সলিটারেশন + সংখ্যা-সাফিক্স দিয়ে ডুপ্লিকেট এড়ানো, অ্যাডমিনে ম্যানুয়ালি এডিটযোগ্য।
- **কখনো ব্ল্যাঙ্ক পেইজ নয়**: প্রতিটা রাউটে `errorComponent` + `notFoundComponent`; অজানা স্লাগে ডিজাইন করা "পাওয়া যায়নি" পেইজ যেখানে সার্চ, জনপ্রিয় ক্যাটাগরি ও প্রোডাক্ট সাজেশন থাকবে। ক্যাচ-অল রাউট সেই একই পেইজে যাবে।
- সব নেভিগেশন `<Link to params>` দিয়ে, ইন্টারপোলেটেড `href` নয়।

## পেইজগুলো (এই ফেজে)

- **হোম**: হেডার (সার্চ, ক্যাটাগরি মেনু, কার্ট আইকন, ভাষা টগল) → হিরো → ক্যাটাগরি গ্রিড → ফিচার্ড/অফার সেকশন (ডায়নামিক) → প্রোডাক্ট গ্রিড → FAQ → ফুটার
- **ক্যাটাগরি/সাব-ক্যাটাগরি**: ব্রেডক্রাম্ব, সাব-ক্যাটাগরি চিপস, প্রোডাক্ট গ্রিড, সর্ট/ফিল্টার, পেজিনেশন
- **প্রোডাক্ট**: ইমেজ গ্যালারি (জুম), ভ্যারিয়েন্ট সিলেক্টর, দাম/ডিসকাউন্ট, স্টক, SKU, ট্যাব করা ডেসক্রিপশন+স্পেসিফিকেশন, রিলেটেড প্রোডাক্ট, অ্যাড-টু-কার্ট (কার্ট লজিক পরের ফেজে)
- **ভাষা টগল**: URL-এ `?lang=` নয় — কুকি/স্টেট ভিত্তিক, ডিফল্ট বাংলা; SSR-এ ঠিকভাবে রেন্ডার হবে

## SEO / GEO / AEO

- প্রতিটা রাউটে নিজস্ব `head()` — title, description, og:title/description/image, twitter:card, self-referencing canonical
- প্রোডাক্টে DB থেকে meta_title/meta_description/og_image; খালি থাকলে নাম+দাম+ক্যাটাগরি থেকে অটো-জেনারেটেড ফলব্যাক (কখনোই খালি মেটা যাবে না)
- JSON-LD: হোমে Organization + WebSite(SearchAction), ক্যাটাগরিতে BreadcrumbList + ItemList, প্রোডাক্টে Product + Offer + AggregateRating + BreadcrumbList, FAQ পেইজে FAQPage
- **AEO**: প্রতিটা প্রোডাক্টে ছোট "এক নজরে" প্রশ্নোত্তর ব্লক (স্ট্রাকচার্ড, FAQPage schema সহ) — AI/ভয়েস অ্যানসারে সরাসরি উঠে আসার জন্য
- **GEO**: Organization schema-তে LocalBusiness + ঠিকানা + areaServed (বাংলাদেশ), hreflang `bn`/`en`
- `/sitemap.xml` — DB থেকে সব ক্যাটাগরি/সাব-ক্যাটাগরি/প্রোডাক্ট/ল্যান্ডিং পেইজ নিয়ে সার্ভার রাউটে জেনারেট
- `/catalog.xml` (Meta/Google Merchant ফিড) — প্রোডাক্ট, দাম, স্টক, ইমেজ, brand, condition সহ
- `robots.txt` আপডেট, সব ইমেজে অর্থবহ alt, lazy loading, semantic HTML, একটি H1

## Cloudflare R2 (মিডিয়া)

- ব্রাউজারে আপলোডের আগে ইমেজ কম্প্রেশন (canvas/WebP, লম্বা দিক সর্বোচ্চ ~2000px, লক্ষ্য <300KB) — মূল ফাইল সার্ভারে যাবে না
- সার্ভার ফাংশন প্রি-সাইনড PUT URL দেবে (অ্যাডমিন রোল যাচাই করে), ব্রাউজার সরাসরি R2-তে আপলোড করবে; DB-তে শুধু object key থাকবে
- পাবলিক রিড হবে R2 পাবলিক ডোমেইন/CDN দিয়ে; ইনভয়েস PDF প্রাইভেট থাকবে, শুধু প্রি-সাইনড GET দিয়ে
- এই ফেজে R2 ক্রেডেনশিয়াল লাগবে: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` — সিক্রেট হিসেবে যোগ করব

## পরবর্তী ফেজ (এই প্ল্যানের বাইরে)

১. কার্ট + `/cart` + `/checkout` (COD) + অর্ডার কনফার্মেশন + ইনভয়েস PDF → R2
২. `/lp/$slug` ল্যান্ডিং পেইজ, নিচে ইনলাইন এক-ধাপ চেকআউট, Meta Pixel/CAPI ইভেন্ট
৩. `/admin` — প্রোডাক্ট/ক্যাটাগরি/ভ্যারিয়েন্ট/ইমেজ/অফার/ল্যান্ডিং/SEO/অর্ডার ম্যানেজমেন্ট, রোল-ভিত্তিক অ্যাক্সেস
৪. সার্চ, রিভিউ, কুপন, অ্যানালিটিক্স

## টেকনিক্যাল নোট

- ডেটা রিড: পাবলিক রাউটে publishable-key সার্ভার ক্লায়েন্ট + narrow `TO anon` SELECT পলিসি; লোডারে `ensureQueryData`, কম্পোনেন্টে `useSuspenseQuery`
- অ্যাডমিন/অর্ডার লেখা: `requireSupabaseAuth` middleware সহ server function; সার্ভিস-রোল শুধু সত্যিকারের প্রিভিলেজড কাজে, হ্যান্ডলারের ভিতরে dynamic import
- ফেজ ১-এ ডেমো ডেটা মাইগ্রেশনেই INSERT হবে, যাতে প্রথম রেন্ডারেই সাইট ভরা দেখায়
