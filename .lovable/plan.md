# Create Order Responsive Layout

## Goal
Make the complete `/admin/orders/create` experience fit cleanly on phones, tablets, and desktops without clipping, horizontal overflow, or cramped controls.

## Changes
- Make the page and its two-column desktop layout shrink safely at every width.
- Reflow customer inputs, address selectors, mode controls, payment fields, and order metadata into mobile-first single-column layouts.
- Rebuild product search result rows with stable mobile grids so long Bangla/English names wrap without pushing variant controls off-screen.
- Rebuild selected-item rows so image, title, quantity, price, and remove action remain readable and tappable on narrow screens.
- Keep product/variant and combo controls within their containers with wrapping and full-width mobile targets.
- Ensure panels, dropdowns, text fields, dates, switches, summaries, and the Create Order action never exceed the viewport.

## Verification
- Check the page at phone, tablet, and desktop widths for horizontal overflow and clipped content.
- Verify inputs, product selection, item quantity/removal, mode switches, and expandable sections remain usable.
- Confirm type checking and the preview build pass.

## Scope
Only the Create Order page’s responsive presentation will change; order creation rules and data behavior remain unchanged.
