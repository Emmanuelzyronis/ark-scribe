# ArkScribe UI/UX Audit Report

**Date:** 2026-09-25
**Auditor:** Senior UI/UX Design Audit (Claude Sonnet 4.6)
**Branch:** main
**Scope:** All frontend pages — landing, auth (login/register), dashboard, record, note, settings

---

## Scores

| Criterion | Score | Threshold |
|---|---|---|
| Visual Hierarchy | 8/10 | PASS |
| Mobile Responsiveness | 4/10 → **7/10 after fix** | FIXED |
| Accessibility | 6/10 → **8/10 after fix** | FIXED |
| Loading & Empty States | 7/10 | PASS |
| Copy Quality | 8/10 | PASS |
| **Overall** | **7.6/10** | PASS |

---

## Visual Hierarchy — 8/10

### Justification
- Landing page h1 (`text-display`, 3.5rem) against body (1rem) yields a 3.5x ratio — clearly dominant.
- "Stop Drowning in EHR Documentation" is unambiguous, pain-first, benefit-forward.
- Primary CTA ("Start Recording Free") uses `bg-ark-primary` with `shadow-primary-glow` — stands out on dark-green surface.
- Stats strip (200K+, 2+ hrs, 5 sec, $79/mo) uses `text-heading-1` for the numbers, creating scannable hierarchy.
- Feature cards use `text-heading-3` for titles versus `text-body-sm` for descriptions — appropriate ratio.
- App dashboard h1 ("Note History") uses `text-heading-2` (1.75rem) — clear. New Recording button in green at top-right provides clear top-level action.
- Note page encounter title was `text-base` — too small for a primary heading in that context; bumped to `text-lg`.

### Issues found
- Note page encounter title (`text-base font-bold`) was the same size as body copy, weakening hierarchy in the header bar.

### Fixes applied
- Changed note page encounter title to `text-lg font-bold` for clearer dominance over metadata line below it.

---

## Mobile Responsiveness — 4/10 → 7/10 (FIXED)

### Justification (pre-fix)
- The app layout (`(app)/layout.tsx`) used a fixed `w-64` sidebar with no mobile toggle, no hamburger, no off-canvas behaviour.
- At 375px, the sidebar consumed 256px leaving only 119px for the main content — completely unusable.
- The side-by-side transcript+note layout in `note/[id]/page.tsx` collapses to two narrow columns at 375px.
- Landing page, auth pages, and dashboard list view were all responsive with `flex-wrap`, `md:grid-cols-*`, and `max-w-sm` centering — those were fine.

### Fixes applied
1. **App layout — mobile drawer sidebar:** Added `useState` for `sidebarOpen`. On `md+` breakpoint, sidebar is `md:static` and always visible. On smaller screens it is `fixed`, `z-30`, and slides in/out via `translate-x`. A full-screen backdrop (black/60) covers the content when open and closes on tap.
2. **Mobile top bar:** Added a `md:hidden` header strip at the top of the main content area with a `Menu` hamburger button (`aria-label="Open navigation menu"`) and the ArkScribe logo.
3. **Auto-close on route change:** `useEffect` on `pathname` resets `sidebarOpen` to `false`, so navigating via the sidebar closes it automatically.
4. **Close button inside sidebar:** Added an `X` button visible only on mobile to close the sidebar from within.

The note page's two-column transcript+note layout remains a desktop-first design. At mobile widths it stacks, which is acceptable for MVP — a future iteration should convert it to a tab-switch (Transcript | Note) on narrow viewports.

---

## Accessibility — 6/10 → 8/10 (FIXED)

### Issues found

1. **Icon-only buttons without accessible labels:**
   - Dashboard: Copy and Delete buttons used only `title` attributes, which are not reliably announced by screen readers.
   - Note page: Back button was `<Link><button>` (invalid HTML — interactive elements cannot nest), and cancel/save icons in the section editor had no labels.
   - Record page: Mute toggle and Stop recording buttons had no `aria-label`.

2. **Invalid HTML:** `<Link href="..."><button>...</button></Link>` in note page header. A link wrapping an interactive element is invalid per HTML spec.

3. **Hidden inputs without labels:** Dashboard search input and status filter `<select>` had no programmatic label — only visible placeholder text, which disappears on focus.

4. **Color contrast note:** `ark-text-disabled` (`#166534`) on `ark-surface` (`#0A3D1F`) is very low contrast (both are deep greens). This is intentional for "disabled" states but should not be used for meaningful content. Current usage (placeholder hint in footer, short HIPAA notice) is acceptable but should be avoided for instructional text.

### Fixes applied

1. **Dashboard copy/delete buttons:** Added `aria-label="Copy note for {title}"` and `aria-label="Delete {title}"` to each. Added `aria-hidden="true"` to the decorative icons.

2. **Note page back navigation:** Replaced `<Link><button>` with a single `<Link>` styled as the button, with `aria-label="Back to dashboard"`.

3. **Note page section editor:** Added `aria-label="Cancel editing"` and `aria-label="Save section"` to the X and Check icon buttons.

4. **Record page:** Added `aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}` and `aria-pressed={muted}` to the mute toggle. Added `aria-label="Stop recording"` to the stop button.

5. **Dashboard search and filter:** Added visually-hidden `<label>` elements (`class="sr-only"`) connected via `htmlFor`/`id` to the search input and status select.

6. **App layout nav links:** Added `aria-current="page"` to the active nav item.

### Still in scope for future iteration
- The note page's two-column layout has no announced relationship between transcript segments and the corresponding note sections.
- Audit table in settings lacks a `<caption>` or `aria-label` on the `<table>`.

---

## Loading & Empty States — 7/10

### Justification
- Dashboard: `EncounterCardSkeleton` renders 5 shimmer cards during load — matches real card shape, correct.
- Dashboard empty state: large Mic icon, heading, contextual subtext, and a primary CTA button — meets all three criteria (icon + message + CTA).
- Dashboard filtered-empty state: different message when search/filter active — good copy awareness.
- App layout loading: spinner + "Loading ArkScribe..." text — acceptable for gate before auth redirect.
- Note page loading: centered `Loader` spinner only, no message — minimal but functional.
- Vocabulary tab: skeleton rows during load, empty-state message when empty — correct.
- Audit tab: skeleton rows during load — correct.
- Record page: Suspense fallback was bare "Loading..." text with no design.

### Fixes applied
- Improved Suspense fallback on record page to match the app loading spinner pattern with "Preparing recorder..." message.

### Areas still worth improving
- Note page load state could say "Loading encounter..." rather than showing only a spinner with no context.
- Error messages surface raw `Error.message` from API calls, which may expose technical stack messages to users. A mapping layer would improve friendliness.

---

## Copy Quality — 8/10

### Justification
- Landing headline: "Stop Drowning in EHR Documentation" — 6 words, leads with the exact pain physicians feel. No jargon.
- Hero subtext communicates the mechanism and outcome clearly ("listens... generates... seconds... time with patients, not paperwork").
- Stats strip uses concrete numbers ($79/mo vs $300–500, 200K+, 5 sec) — builds credibility without hype.
- CTAs are action-specific: "Start Recording Free", "Generate Note", "Copy Note", "Finalize", "Rewrite with Claude" — not a single "Submit" or "Click here".
- HIPAA reassurance appears in the right places (login/register footers, landing trust badges) without being heavy-handed.
- "Join the waitlist. First 100 physicians get 3 months free." — creates urgency without false scarcity.

### Minor issues
- "Note History" as the dashboard h1 is functional but emotionally flat — "Your Encounters" or "Patient Notes" would feel more physician-native.
- Error message fallback strings like "Failed to load encounters" and "Delete failed" are serviceable but not warm.
- Record page top-bar shows "Encounter ID: {currentId}" — a raw UUID, not a patient name or date. Reveals implementation detail to end user.

---

## Final Verdict

**Overall score: 7.6/10 — PASS after fixes**

ArkScribe's design is cohesive, intentional, and thematically strong. The dark-green token system (`#052E16` / `#22C55E` / `#A3E635`) creates an immediately distinctive medical-tech aesthetic that reads as clinical-serious without being sterile. The landing page is the strongest element — it will hold its own on a hackathon stage.

The two critical pre-fix gaps were:
1. The fixed desktop sidebar was entirely non-functional on mobile, which would have disqualified the app for any judge testing on a phone.
2. Icon-only buttons without accessible labels, and one instance of invalid HTML (interactive element nesting).

Both are now resolved.

---

## User Value Answer

**"If a user saw this product for the first time, would they IMMEDIATELY understand what it does and want to use it? Does it solve something painful enough that they would pay for it? What is the ONE moment in the UX that makes them say YES?"**

Yes — but only if they land on the landing page.

The landing page passes the 5-second test: the headline "Stop Drowning in EHR Documentation" + the stats (2+ hrs saved, 5 sec to generate) communicate the value immediately to any physician who has spent an evening finishing charts. The $79/mo vs $300–500 comparison lands the pricing punch.

The problem is real and painful enough to pay for. Physician burnout at 53% globally with documentation as the top driver, combined with enterprise tools locked behind hospital contracts, is a genuine gap. The market framing is accurate and the target user (independent practice physician) is well-defined.

**The ONE YES moment:** After the demo encounter, clicking "Generate Note" and watching a full SOAP note with ICD-10 codes appear in under 5 seconds. This is the moment. Everything before it is setup. Everything after it is retention. If the demo note is clinically accurate, the physician's internal monologue becomes: "I would have spent 8 minutes writing this. This took 5 seconds." That is the conversion event.

**What still needs to change before a live demo:**
1. The record page shows "Encounter ID: [raw UUID]" in the header — replace with the encounter title or date so it reads as a product, not a prototype.
2. The simulated transcript is good (`chest pain, hypertension, Lisinopril 10mg...`) but the generated SOAP note quality is the make-or-break. If Claude returns a generic SOAP note, the demo fails. Ensure the system prompt in `note/generate` is tuned to return specialty-appropriate clinical language.
3. The vocabulary feature exists but is empty by default — pre-populate it with 3–5 cardiology/internal-medicine terms so the demo feels configured for the physician archetype.

Fix those three things and the demo is winning-quality.
