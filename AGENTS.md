<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Serve machine-readable discovery resources through dedicated TanStack server routes so they return correct status codes, content types, and bodies instead of the HTML catch-all.
- Keep landing-editor helpers client-safe and use the existing landing schema; admin previews must not mount checkout or emit storefront tracking events.
- Resolve country names through Intl.DisplayNames and serve bundled ISO country-flag SVG assets; never fetch flags from third-party hosts or infer countries from missing IP data.
- Keep auth form validation in a client-safe schema helper; never sanitize password characters or change authentication configuration for presentation work.
- Define page titles, descriptions, social descriptions, and self-referencing canonicals only in leaf route heads; the root holds sitewide metadata so page descriptions cannot compete.
