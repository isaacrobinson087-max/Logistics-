# KINETIC — Logistics Website & Operations Prototype

**Current development focus:** refine the cinematic homepage and prepare reliable mobile-first deployment.

## Where things live
- **Code:** https://github.com/isaacrobinson087-max/Logistics-
- **Hosting target:** Cloudflare Pages (Git-connected to this repository).
- **Production branch:** `main`.
- **Cloudflare URL:** Not assigned or verified yet. Create/connect the Pages project to receive its actual `*.pages.dev` address.

## What has been built
Five public website views: Home, About, Book & Track, Contact and Account. The homepage uses a short truck-arrival film, simple welcome typography and short supporting sections, without 3D/cursor motion. Browser-local booking, assignment, rider updates and tracking-reference lookup are demonstrations only.

The real logistics backend, login, multi-company access, rider GPS, ETA, payments and WhatsApp messaging are **not connected**. Do not enter real customer information, collect payments or present the demonstration as a live courier service.

## New Cloudflare Pages workflow
The repository now includes a dependency-free build pipeline, syntax/asset checks, production output under `dist/`, static hosting headers and GitHub Actions checks.

**Cloudflare Pages settings:**
- GitHub repository: `isaacrobinson087-max/Logistics-`
- Production branch: `main`
- Framework: None
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root

Full one-time connection steps: [docs/CLOUDFLARE_SETUP.md](docs/CLOUDFLARE_SETUP.md).

After connecting GitHub to Cloudflare Pages, pushes to `main` will deploy automatically. We will share the confirmed Cloudflare preview URL once the project is created and its first deployment succeeds.

The old GitHub Pages publishing workflow is currently retained as a fallback. Disable it **after** the Cloudflare site is verified; do not maintain two public preview hosts indefinitely.

## Development checks
No dependencies or code downloads needed for the user. For developers:
```
npm run check
npm run build
```
The output is a static `dist/` website ready for Cloudflare Pages.

## Production readiness
Before accepting actual orders: confirm asset licenses, add secure authentication/company isolation, protected booking and status APIs, real-time sync, verified location updates with consent, audit logs, and real phone/device testing.
