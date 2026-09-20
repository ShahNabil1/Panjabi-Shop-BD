# Taxonomy mobile, sorting, SEO, and rich text

## What will change
- Rework `/admin/taxonomy` into a mobile-first single-column layout, with stable form widths, wrapping status/actions, full-width save controls, and category/subcategory rows that remain readable at phone widths.
- Remove both category and subcategory `Sort order` inputs.
- Add drag-to-sort lists for categories and subcategories, matching the existing `/admin/products` behavior, with immediate persistence and clear saving/error feedback.
- Reuse the shared `TextField` and `AreaField` limits everywhere Meta Title and Meta Description are editable: 60 and 160 characters respectively, including live counters and paste-safe hard limits.
- Replace category and subcategory description textareas with the existing shared rich-text editor.
- Render category and subcategory rich descriptions through the same sanitized storefront renderer used for products.
- Remove the built-in emoji strip from the shared rich-text editor; emoji entered through the device keyboard, system picker, paste, or context menu will remain supported.

## Technical details
- Add validated category/subcategory reorder server actions that accept ordered UUID lists and update `sort_order`; keep existing schema fields for stored ordering while hiding manual input.
- Tighten server schemas for every saved `meta_title` and `meta_description` to 60/160 characters so frontend and server rules agree.
- Convert rich HTML to plain text before using category/subcategory descriptions as SEO fallbacks, preventing markup from entering metadata.
- Keep current category/subcategory data structures, image handling, visibility toggles, featured limits, URLs, and delete confirmations unchanged.

## Verification
- Check the taxonomy page at the current 393×852 phone viewport and desktop width for clipping, overflow, readable controls, and correct list actions.
- Verify category and subcategory drag ordering persists after refresh.
- Verify all SEO fields stop typing/pasting at 60/160 characters.
- Verify rich formatting saves and appears safely on category and subcategory storefront pages, while the editor has no emoji strip.
- Confirm the preview build and focused type checks pass.
