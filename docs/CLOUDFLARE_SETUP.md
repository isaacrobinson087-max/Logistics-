# Cloudflare Pages — KINETIC hosting handover

## Source of truth
GitHub: https://github.com/isaacrobinson087-max/Logistics-
Branch: main
Cloudflare Pages hosting has been selected, but it is not considered live until a deployment succeeds and its actual address is verified.

## One-time Cloudflare setup
1. Open the Cloudflare dashboard: https://dash.cloudflare.com/
2. Open **Workers & Pages**, then create a **Pages** project using **Git integration**.
3. Connect GitHub and authorize the **isaacrobinson087-max/Logistics-** repository.
4. Select production branch **main** and enter:
   - Framework preset: **None**
   - Build command: **npm run build**
   - Build output directory: **dist**
   - Root directory: **repository root** (leave unchanged)
5. Save and deploy. Cloudflare will display the actual project hostname ending in `.pages.dev`.

**Do not invent or assume the Cloudflare subdomain before project creation.**

## Development workflow
- Edits are made in GitHub, ideally on review branches.
- The automated checks validate JavaScript syntax, required pages and media references, and generate the production folder.
- Once Git integration is active, commits to main trigger a Cloudflare Pages build.
- Review production at the verified Cloudflare Pages address; branch previews may be available from Cloudflare.

## Current limitations
This is still a design and functional demo, not a live courier operating system. Its bookings and statuses use browser-local storage. Admin and rider demo routes are not authenticated. No payments, real GPS, ETA, Firebase, or WhatsApp automation are connected. Do not use real customer data.

## Transition plan
Once Cloudflare Pages deployment is confirmed working, remove/disable the old GitHub Pages publishing workflow to avoid maintaining two independent production targets. Do not remove it before validating the new host.
