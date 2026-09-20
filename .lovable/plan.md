# Order detail responsiveness and customer blocking

## Goal
Make every order-detail section fit cleanly on phones, capture useful customer security signals, and enforce IP, device, or phone blocks before shopping actions and order placement.

## Changes
- Rework order item rows for phones so product names wrap cleanly and quantity, price, total, and remove controls remain readable.
- Make Fulfillment/RTS courier cards and Order Source cards shrink, wrap, and break long IDs/URLs without horizontal overflow.
- Capture the visitor’s real edge-provided IP address and available IP-based location details (country, region/division, city, postal code, coordinates, timezone), plus a stable browser fingerprint generated from browser/device signals.
- Save these values on complete and incomplete orders and show the location in Device & Security.
- Add a public, narrowly scoped access check that matches the current request IP and browser fingerprint against blocked identifiers without exposing the block list.
- Check access before Add to Cart and Buy Now everywhere. If blocked, show a branded dialog with clickable WhatsApp and phone actions instead of modifying the cart.
- Re-check IP, fingerprint, and checkout phone on the server during order placement so bypassing the browser controls cannot place an order.
- Keep the existing admin Block/Unblock controls, make combined selections work, and ensure phone blocking returns the same branded contact dialog at checkout.

## Technical details
- Extend `orders` with structured IP-location data and update the existing checkout database routines to persist fingerprint/location and reject blocked identifiers atomically.
- Use request headers supplied by the hosting edge for the real client IP and available geolocation; no intrusive browser location-permission prompt.
- Store only a one-way browser fingerprint identifier, not raw fingerprint inputs.
- Keep `blocked_identifiers` private to authorized staff; public checks return only blocked/not-blocked.
- Validate the changed code, then inspect public pages at phone width. Authenticated order-detail browser testing is limited because this externally managed Supabase project cannot inject an admin preview session.

## Important accuracy note
IP geolocation is network-derived and can be approximate when a customer uses mobile data, VPN, or proxy. The checkout address remains the authoritative division/district/upazila; captured IP location is supporting fraud/security evidence.
