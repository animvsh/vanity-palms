# Vanity Palms — Figma Flow Integration Plan

## Context

The Figma demo at `mood-last-83756782.figma.site` defines a 5-step user journey: **Choose Concern → Explore Treatments → Visualize → Compare → Book**. The codebase has pages for every step, but the navigation chain between them is broken in multiple places — dead ends, missing links, unreachable pages. This plan fixes every gap so users can complete the full journey end-to-end.

---

## Phase 1: Fix Core Funnel (Highest Impact)

### 1. Visualizer Dead End — Add "Find Providers" CTA
**File:** `src/pages/Visualizer.tsx`
- After the user uploads a photo and interacts with features, show a CTA panel at the bottom of the right sidebar (below the tabs content)
- "Ready for the next step?" heading + "Find Providers →" button → `/providers` + "Compare Providers" link
- Only visible once `landmarks !== null` (photo processed)
- This is the **single biggest funnel break** — step 3→4 is completely severed

### 2. Fix How It Works Step Links
**File:** `src/pages/Index.tsx`
- Step 2 ("Explore Treatments"): change `to` from `/providers` → `/#concerns` (treatments start from concerns)
- Steps 4-5 stay at `/providers` (comparison/booking start from provider selection)

### 3. Navbar — Add "For Providers" Link
**File:** `src/components/Navbar.tsx`
- Add `{ path: "/provider/signup", label: "For Providers" }` to nav links (desktop + mobile)
- Only show when user is NOT authenticated (providers already have dashboard link when logged in)
- Currently there is zero discoverability for the provider portal

---

## Phase 2: Connect Dead Ends

### 4. UserDashboard — Add Consultations Section
**File:** `src/pages/user/UserDashboard.tsx`
- Add "My Consultations" section showing the user's submitted consultation requests
- Each card: provider name, status badge, date, "Continue →" link to `/consultation/:token`
- May need new API function `fetchConsultationsByUser()` in `src/lib/api.ts`
- Without this, patients lose their consultation thread after closing the modal

### 5. Provider Dashboard — Fix Pending/Rejected Dead Ends
**File:** `src/pages/provider/ProviderDashboard.tsx`
- Pending state (~line 290): add `mailto:support@vanitypalms.com` support link below Sign Out
- Rejected state (~line 307): add support contact + "Learn More" link to `/about`
- Currently these states only have a Sign Out button — complete dead ends

### 6. Footer — Fix Contact & Browse Procedures Links
**File:** `src/components/Footer.tsx`
- "Contact" link: change from `<Link to="/about">` to `<a href="mailto:hello@vanitypalms.com">`
- "Browse Procedures" label: rename to "Explore Treatments" and link to `/#concerns`

---

## Phase 3: Navigation Polish

### 7. ProcedureDetail — Contextual Back Link
**File:** `src/pages/ProcedureDetail.tsx`
- Replace hardcoded `<Link to="/concerns/${procedure.concernId}">` with `navigate(-1)` fallback
- Currently always goes to concern page even if user arrived from provider profile

### 8. ReviewRequest — Add Provider Profile Link
**File:** `src/pages/ReviewRequest.tsx`
- On the thank-you screen, add "View [Provider]'s Profile" button linking to `/providers/:id`
- Currently only "Back to Vanity Palms" → `/` (no way back to the provider)

### 9. ConcernDetail — Add Visualizer CTA
**File:** `src/pages/ConcernDetail.tsx`
- After the procedure list, add a small CTA: "Curious what results might look like? Try the AI Visualizer →"
- Bridges step 2 (Explore Treatments) → step 3 (Visualize)

### 10. CompareProviders — Add Final Booking CTA
**File:** `src/pages/CompareProviders.tsx`
- Add a summary CTA at the bottom: "Found the right provider? Request a consultation."
- Bridges step 4 (Compare) → step 5 (Book)

---

## Files Modified

| File | Change | Priority |
|------|--------|----------|
| `src/pages/Visualizer.tsx` | Add provider CTA panel | P1 |
| `src/pages/Index.tsx` | Fix step 2 link | P1 |
| `src/components/Navbar.tsx` | Add "For Providers" link | P1 |
| `src/pages/user/UserDashboard.tsx` | Add consultations section | P2 |
| `src/lib/api.ts` | Add fetchConsultationsByUser if needed | P2 |
| `src/pages/provider/ProviderDashboard.tsx` | Add support contacts to dead-end states | P2 |
| `src/components/Footer.tsx` | Fix Contact + Browse Procedures links | P2 |
| `src/pages/ProcedureDetail.tsx` | Contextual back navigation | P3 |
| `src/pages/ReviewRequest.tsx` | Add provider profile link on thank-you | P3 |
| `src/pages/ConcernDetail.tsx` | Add visualizer CTA | P3 |
| `src/pages/CompareProviders.tsx` | Add booking CTA at bottom | P3 |

## Verification

1. `npx tsc --noEmit` — TypeScript compiles clean
2. `npx vitest run` — All 22 tests pass
3. Manual flow test: Homepage → Browse Concerns → Pick Concern → Pick Procedure → View Provider → Request Consultation → See it in UserDashboard
4. Manual flow test: Homepage → Try Visualizer → Use face tool → Click "Find Providers" → Compare → Book
5. Manual flow test: Provider signup → pending state → support link visible
6. Verify all footer links resolve to real pages/actions
7. `npm run build` → deploy to Cloudflare Pages
