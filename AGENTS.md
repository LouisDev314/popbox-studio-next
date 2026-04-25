# AGENTS.md

## What this repo is
Frontend-only repo for PopBox Studio, a production-ready single-vendor e-commerce storefront for anime merchandise and Ichiban Kuji products.

Stack:
- Next.js App Router
- TypeScript
- Tailwind CSS
- TanStack Query
- Axios-based API layer
- Supabase Auth (if/where used on frontend)

Backend is a separate repo. This repo consumes backend APIs and should not re-implement backend business logic.

---

## Core rules
- Stay frontend-only. Do not add backend/server business logic unless explicitly requested.
- Keep architecture simple and explainable in interviews.
- Reuse existing patterns before introducing new ones.
- Do not over-engineer.
- Do not rewrite stable code without a clear reason.
- Do not broaden scope beyond the requested task.

---

## Frontend architecture rules
- Use App Router conventions already present in the repo.
- Prefer server components by default.
- Use client components only when interactivity, browser APIs, hooks, or client-side state are required.
- Do not convert server components to client components unless necessary.
- Keep data flow predictable and minimal.

### Data fetching
- Do not use raw `fetch` unless explicitly requested or already required by an existing pattern.
- Prefer the repo’s established Axios/query stack.
- Reuse `QueryConfigs` for API request definitions.
- Reuse `useCustomizeQuery` / existing query hooks for client-side data fetching.
- If a component is server-side, use a server-safe data-access approach already consistent with the repo.
- Do not mix multiple fetching styles in the same feature without a strong reason.

### API handling
- Read API payloads using the repo’s existing response conventions.
- Preserve fallback behavior on request failure.
- Do not invent alternate response shapes.
- Do not hardcode API URLs if an existing config/client already handles them.

---

## UI and product rules
- PopBox Studio is premium, modern, restrained, and product-focused.
- Keep interfaces clean, polished, and production-ready.
- Prefer strong layout, spacing, typography, and hierarchy over extra decoration.
- Avoid clutter, generic dashboard-card spam, or unnecessary visual noise.
- Respect existing design patterns before introducing new ones.
- Mobile behavior must be considered for every UI change.
- Desktop and mobile nav behavior must both remain correct.

### Storefront priorities
- Product browsing must feel clean and intuitive.
- Collection, type, tag, and search behavior must remain consistent.
- Active nav state must be correct.
- Filtering/sorting UI must reflect actual URL/search-param state.
- Do not break SEO-sensitive pages or public storefront routes.

---

## Business constraints
- Single-vendor store.
- Canada-only shipping for MVP.
- Product types are only:
    - `standard`
    - `kuji`
- Cart and wishlist are client-owned for MVP unless explicitly changed.
- Stripe checkout is source-of-truth through backend flows.
- Frontend should not assume payment success before backend confirmation.
- Do not add frontend logic that bypasses backend inventory/order/payment rules.

---

## Coding rules
- Keep components small and readable.
- Prefer extending existing components/utilities over creating parallel patterns.
- Follow existing naming and folder conventions.
- Preserve strong TypeScript safety.
- Avoid `any`.
- Remove dead imports and dead code.
- Keep props/contracts stable unless the task requires changing them.
- Avoid unnecessary abstractions, wrappers, or custom hooks.

### When editing code
- Fix the smallest correct surface area.
- Preserve existing behavior unless the request is to change behavior.
- Call out trade-offs when they matter.
- Check for edge cases:
    - loading state
    - error fallback
    - empty state
    - mobile layout
    - active nav state
    - server/client boundary issues
    - hydration risk

---

## Performance and quality rules
- Do not introduce avoidable client-side fetching if server rendering is sufficient.
- Do not introduce unnecessary re-renders.
- Be careful with large client components.
- Avoid shipping duplicate logic across desktop/mobile implementations.
- Preserve perceived performance and responsive feel.
- Prefer simple, robust solutions over clever ones.

---

## Styling rules
- Use Tailwind and existing utilities/patterns already in the repo.
- Match the current visual language.
- Do not introduce a new design system ad hoc.
- Avoid random one-off styling unless necessary.
- Keep spacing, radius, shadows, and typography consistent with the rest of the app.

---

## What to avoid
- No micro-frontend thinking
- No unnecessary global state
- No new fetching abstraction if repo already has one
- No mixing fetch, axios, and query patterns randomly
- No forced client conversion of server components
- No speculative refactors
- No placeholder architecture “for the future”
- No backend logic duplication on frontend

---

## Definition of done
A task is done when:
- it follows existing repo patterns
- it is type-safe
- it does not break current behavior unless intended
- it works on mobile and desktop
- it keeps server/client boundaries correct
- it is production-appropriate and explainable in an interview
- pnpm check passes everything with no warning or errors or issues
- in the end append the suggested commit message for the changes

---

## HTTP client rule
- Do not use raw `fetch` anywhere in this repo.
- This includes:
  - server components
  - route handlers
  - utility modules
  - client components
- Use the repo’s approved Axios-based patterns only.
- Do not introduce `fetch` for low-level server cases unless explicitly requested.
- If a task appears to require lower-level response/header handling, keep Axios and implement the smallest correct solution instead of switching transport.
