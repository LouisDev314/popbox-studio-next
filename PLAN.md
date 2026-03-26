# PLAN.md

## Current objective
Build a production-ready PopBox Studio storefront that is clean, performant, mobile-friendly, and fully integrated with the backend API.

## Current priorities
1. Stabilize storefront navigation and routing
2. Standardize frontend data-fetching patterns
3. Complete product browsing and detail flows
4. Harden cart and checkout UX
5. Finish legal/support/account pages
6. Improve polish, responsiveness, and production readiness

---

## Active rules for current work
- Prefer the existing repo patterns over introducing new abstractions
- Fix behavior before polishing visuals
- Do not over-engineer
- Keep changes narrowly scoped
- Preserve SEO-safe and SSR-safe behavior where applicable
- Verify both desktop and mobile behavior after changes

---

## Current milestones

### 1. Navigation and routing
- Ensure active nav states are always correct
- Ensure collection/type/tag/search-param behavior stays in sync
- Fix mobile navigation usability issues
- Prevent regressions in legal/support/store routes

### 2. Data fetching consistency
- Remove inconsistent raw request patterns where appropriate
- Reuse `QueryConfigs` and existing query conventions
- Keep server/client boundaries correct
- Avoid forcing client hooks into server components

### 3. Store pages
- Product listing pages must have correct filtering/sorting behavior
- Product detail pages must be stable and production-ready
- Recommendations, collections, and related content should use established API/query patterns

### 4. Cart and checkout UX
- Keep cart flow simple and reliable
- Ensure checkout initiation matches backend contract
- Do not fake payment success on frontend
- Preserve clear feedback for loading, success, and failure states

### 5. Content pages
- Legal, FAQ, contact, and support pages should be complete and polished
- Avoid unnecessary client-side complexity for static or mostly static content

### 6. Final polish
- Improve responsiveness
- Reduce UI inconsistencies
- Improve empty/loading/error states
- Keep code interview-friendly and easy to explain

---

## Non-goals
- No major architecture rewrite
- No new state management solution unless clearly necessary
- No duplicate data-fetching systems
- No speculative optimization
- No backend business logic moved into frontend

---

## How Codex should operate
For each task:
1. inspect existing pattern first
2. make the smallest correct change
3. preserve behavior unless explicitly changing behavior
4. keep types strict
5. avoid over-engineering
