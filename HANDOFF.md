# Vanity Palm — Production Handoff Document

## Status: Ready for Staging

All critical security issues have been fixed. The app builds, passes all 22 tests, and TypeScript compiles clean. Below is the full audit summary and remaining work prioritized for launch.

---

## What Was Fixed (PR #12, #13)

### Security (Critical → Fixed)
- ✅ Removed hardcoded admin email (`aalang@ucsc.edu`) from client JS bundle — admin access now relies solely on `is_admin` RPC
- ✅ Edge function: added input validation (10MB image limit, 2000 char prompt, MIME whitelist)
- ✅ Edge function: restricted CORS to `ALLOWED_ORIGINS` env var (no more wildcard `*`)
- ✅ Edge function: stopped leaking internal error details to client
- ✅ Confirmed `.env` was never committed to git

### Performance (Critical → Fixed)
- ✅ React.lazy + Suspense code splitting for all 17 routes (Visualizer, Dashboard, Admin, etc.)
- ✅ Removed dead code: 3 unused components, 4 unused exports, placeholder test

### Error Handling (Critical → Fixed)
- ✅ Admin approve/reject/override handlers: added try-catch + toast notifications
- ✅ Admin providers fetch: replaced `console.error` with user-facing toast
- ✅ AI pipeline: fixed uncleared 90s setTimeout in Promise.race
- ✅ Rejection reason now passed through to `updateProviderStatus`

### Bug Fixes
- ✅ Removed duplicate `featureValuesRef` declaration in Visualizer.tsx (was causing shadowing)
- ✅ Resolved all merge conflicts with origin/main (skin features, shared admin state)
- ✅ Integrated skin features (smoother/textured/firmer/softer) with standardized prompts

---

## Remaining Work — Prioritized

### P0: Must Fix Before Launch — ✅ ALL COMPLETE

| Issue | Status |
|-------|--------|
| Enable JWT verification on edge function | ✅ `supabase/config.toml` — `verify_jwt = true` |
| Enable email confirmations | ✅ `supabase/config.toml` — `enable_confirmations = true` |
| Strengthen password policy (12 chars + complexity) | ✅ `supabase/config.toml` — 12 chars + `lower_upper_letters_digits_symbols` |
| Add FK indexes (10 missing) | ✅ `supabase/migrations/20260406_p0_hardening.sql` |
| Fix `submit_review_request` signature (4 fields silently dropped) | ✅ Migration adds columns + updates RPC |
| Fix `fetchConsultationMessages` — already uses token-based RPC | ✅ Verified `ConsultationThread.tsx` correctly dispatches by sender type |
| Add `SET search_path` to `get_unread_message_count` | ✅ Migration rewrites function with `SET search_path = public` |
| Add MIME type validation to `uploadProviderImage` | ✅ `src/lib/api.ts` — whitelist + 10MB size limit |
| Wrap RLS `is_admin()` calls in `(SELECT ...)` | ✅ Migration rewrites all 10 policies |
| Add security headers (CSP, X-Frame-Options, etc.) | ✅ `public/_headers` for Cloudflare Pages |
| Add message body length limit | ✅ Migration adds `CHECK(length(body) <= 5000)` + RPC validation |

### P1: Should Fix Before Launch

| Issue | Status |
|-------|--------|
| Split `ProviderDashboard.tsx` (2215 lines → 6 sub-components) | 🔲 3 hrs |
| Split `api.ts` (1147 lines → domain modules) | 🔲 2 hrs |
| Adopt TanStack Query for data fetching (already installed, unused) | 🔲 4 hrs |
| Add route-level error boundaries | ✅ `RouteErrorBoundary.tsx` wraps all routes |
| Add route-level auth guards (`RequireAuth` wrapper) | ⏭️ Deferred — each protected page handles auth internally |
| Add `strictNullChecks: true` to tsconfig | 🔲 2 hrs |
| Fix `N+1` in `fetchProvidersByProcedure` | ✅ Single query with filter join |
| Move analytics aggregation server-side | 🔲 2 hrs |
| Add Zod schemas for API response validation | 🔲 3 hrs |

### P2: Should Fix for Quality

| Issue | Status |
|-------|--------|
| Accessibility: add skip link | ✅ `index.html` skip link + `id="main-content"` |
| Accessibility: fix Navbar nested interactive elements | ✅ Removed all `<Link><button>` nesting |
| Accessibility: add ARIA to star rating, boolean toggles | ✅ `role="radiogroup"`, `role="radio"`, `aria-checked`, `aria-label` |
| Increase slider thumb touch target to 44px | ✅ Enlarged thumb + invisible touch area |
| Increase toolbar button size for mobile | 🔲 15 min |
| Add `React.memo` to list-rendered components | ✅ `ProviderCard` memoized |
| Add requestAnimationFrame throttle to warp rendering | 🔲 30 min |
| Remove unused Radix UI packages from bundle | ⏭️ All packages used via shadcn/ui wrappers |
| Fix render-blocking Google Fonts import | ✅ Moved to async `<link>` with `preconnect` |
| Add test coverage thresholds | ✅ `vitest.config.ts` — 30% threshold with v8 provider |

### P3: Nice to Have

| Issue | Effort |
|-------|--------|
| Add Sentry/error reporting integration | 1 hr |
| Add offline detection | 1 hr |
| Move MLS warp to Web Worker | 4 hrs |
| Host MediaPipe WASM locally (remove CDN dependency) | 1 hr |
| Add test coverage thresholds to vitest config | 30 min |
| Write tests for `api.ts` mapper functions | 4 hrs |
| Write tests for `warp.ts` `computeTargetLandmarks` | 2 hrs |
| Write tests for auth flows (signup/login) | 3 hrs |

---

## Architecture Overview

```
src/
├── components/          # Shared UI components (shadcn/ui + custom)
│   ├── ui/              # Radix UI primitives (shadcn)
│   ├── provider/        # Provider-specific (badges, onboarding)
│   └── reviews/         # Review metrics
├── pages/               # Route-level page components
│   ├── provider/        # Provider dashboard, login, signup
│   ├── admin/           # Admin console
│   └── user/            # User auth + dashboard
├── visualizer/          # AI visualization pipeline
│   ├── chatParser.ts    # NLP intent → feature deltas
│   ├── aiPipeline.ts    # Gemini API via Supabase Edge Function
│   ├── landmarks.ts     # MediaPipe landmark indices + transforms
│   ├── warp.ts          # MLS image warping algorithm
│   └── useFaceMesh.ts   # React hook for face detection
├── lib/
│   ├── api.ts           # Supabase data layer (needs splitting)
│   ├── supabase.ts      # Supabase client initialization
│   └── utils.ts         # Utility functions
├── data/
│   ├── constants.ts     # Domain constants, procedures
│   └── mockData.ts      # Type definitions (misnamed)
└── hooks/               # Custom React hooks
```

### Key Infrastructure
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions)
- **AI Pipeline**: Gemini `gemini-2.0-flash-exp-image-generation` (primary) → FLUX.1 Kontext (fallback)
- **Face Detection**: MediaPipe FaceLandmarker (468-point mesh, WASM, GPU with CPU fallback)
- **Image Warping**: Moving Least Squares (grid-optimized, CPU-bound)

### Supabase Secrets (configured)
- `GEMINI_API_KEY` — Google AI Studio key
- `ALLOWED_ORIGINS` — CORS whitelist for edge function

### Environment Variables (`.env`)
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key

---

## Test Coverage

- **22 tests passing** across 7 test files
- **~20% estimated coverage** — critical gaps in `api.ts`, `warp.ts`, auth flows
- Best covered: `chatParser.ts` (11 tests), `aiPipeline.ts` (3 tests)
- No coverage thresholds configured

---

## Audit Reports Available

11 detailed audit reports were generated on 2026-04-05 covering:
1. Security (2 critical, 5 high, 5 medium)
2. TypeScript quality (10 high, 9 medium)
3. Architecture (6 critical, 7 high, 6 medium)
4. Database/Supabase (3 critical, 4 high, 5 medium)
5. Performance (1 critical, 4 high, 3 medium)
6. Test coverage (~20%, 10 priority gaps)
7. Accessibility (5 critical, 10 high, 10 medium)
8. Error handling (3 critical, 4 high, 7 medium)
9. Edge function (2 critical, 3 high, 3 medium)
10. Dead code (8 safe removals identified, all removed)
11. Mobile/responsive (2 high, 3 medium)
