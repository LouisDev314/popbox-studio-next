# Production reliability release and measurement

This change is local until an approved release. Passing tests does not demonstrate
lower production CPU usage or remove the Hobby plan's availability risk.

## Behavior and freshness

- Collections and tags use Next's persistent data cache, with a 300-second
  revalidation interval. React memoization still deduplicates reads within a render.
- Successful collection reordering immediately expires the collections tag and
  preserves the existing layout invalidation. Other taxonomy mutations propagate
  through the TTL; direct backend writes do not invalidate the frontend cache.
- Product detail, listings, recommendations, shipping settings, checkout and private
  account/order data have no new persistent cache. The existing five-minute
  homepage snapshot remains.
- Because the server header consumes cached collections, otherwise-static store
  pages also inherit a five-minute revalidation interval. Check their regeneration
  CPU after release; data caching is not a guarantee of lower total compute.
- Cache revalidation can retain a last successful value during an origin outage.
  No error-derived empty taxonomy or incomplete sitemap is stored as successful data.
- Sitemap entries are cached for an hour. Traversal has a five-second Axios timeout
  per request, a 30-second cancellation deadline, a 50-page limit and repeated-cursor
  detection. A cold failure returns core URLs; a failed refresh keeps the last
  complete sitemap.
- Homepage regeneration failures reject, preserving Next ISR's last successful
  snapshot. A cold error has retry/browse actions through the store error boundary.
- Anonymous requests without Supabase Auth cookies bypass SDK processing. Signed-in
  visitors still refresh sessions, and admin requests always verify claims. Refreshed
  `Set-Cookie` and private/no-store headers must never be removed to increase hits.

## Release prerequisites

1. Use Node 24 and pnpm 10.30.2 (`corepack pnpm`). Run `corepack pnpm check` and
   `corepack pnpm exec tsc --noEmit --incremental false`.
2. Run `corepack pnpm test:production`. It runs the required checks/build against a
   local fake backend, starts a production server, and waits through the actual
   five-minute homepage expiry. Intentional failures have runtime Sentry disabled.
   The build embeds the fixture origin, so **never deploy this test build**. Make a
   new build in the intended deployment environment.
3. Run the relevant browser regressions, including `compatibility.spec.ts` under
   desktop, mobile and `webkit-compatibility`. Install WebKit with the repository's
   Playwright version if needed. The compatibility test removes `toSorted` before
   application startup and checks prize sorting and interaction.
4. On Vercel production, configure `SENTRY_ORG`, `SENTRY_PROJECT` and
   `SENTRY_AUTH_TOKEN` for the build, storing the token as a Secret. Vercel supplies
   environment variables to both builds and runtime; this is not a build-only
   storage boundary. Never expose the token through `NEXT_PUBLIC_`, paste it into
   logs or commit it. `VERCEL_GIT_COMMIT_SHA` supplies the release; `SENTRY_RELEASE`
   is the fallback for deployments without Git metadata. Production builds fail
   when required upload configuration or release identity is missing. Explicit
   `SENTRY_ENABLE_BUILD=false` remains an operational opt-out, not the production
   default. No dashboard configuration was changed by this patch.
5. Verify the deployed chunk has a matching source map/Debug ID and that a controlled
   test event identifies its release and original source. A different CI build's
   uploaded maps do not establish mapping for the Vercel build.
6. Release the separate backend patch only after verifying the host restarts failed
   processes and considers a DB-gated startup unready. Backend startup now retries
   a transient warmup once and exits after exhaustion rather than exposing HTTP
   without reservation cleanup jobs. Verify cleanup succeeds after restart.

The backend patch also initializes Sentry before HTTP/database imports, measures
product lookup/relation operations and existing advisory-connection acquisition,
and omits inapplicable public product relations. Query spans include total client
elapsed time; they must not be described as isolated database execution or pool wait.
Webhook locks, transaction retries, pool sizes, rate limits and schema are unchanged.

## Local verification record — November 16, 2026

- Frontend `pnpm check`: lint, 753 tests across 126 files, and production build passed.
  Separate TypeScript checking also passed.
- Backend `pnpm check`: lint, 489 tests across 46 files, and build passed under
  Node 24/pnpm 10.30.2. Coverage includes webhook, inventory, reservation and Kuji
  regression suites as well as the new startup/relation checks.
- The local production-server test passed taxonomy reuse and invalidation, uncached
  price/stock changes, sitemap reuse, recovery after a taxonomy outage, and retention
  of the successful homepage after the real 300-second ISR interval and an origin
  failure. These checks used fixture services, not production data.
- Across the targeted browser runs, 33 tests passed; two desktop-only keyboard tests
  were intentionally skipped in the mobile project. Coverage included account/admin
  authentication, checkout entry, collection/Featured ordering, variant cart lines,
  and Kuji interaction with `toSorted` removed in Chromium and WebKit. Existing tests
  were corrected to click visible variant labels and await keyboard drag states.
- No deployment, billing change, firewall change or production data mutation was
  performed. Production source-map attribution and resource improvement remain
  release verification steps, not claims established by local tests.

## Production smoke checks

- Confirm the intended SHA, domain and environment before release.
- Check anonymous and signed-in browsing, collection URL filters/sorting, mobile and
  desktop navigation, real 404s, structured data and public image delivery.
- Verify expired/chunked sessions refresh safely and admin requests remain protected.
- Check a pending/failed checkout lookup never claims successful payment. Preserve
  backend confirmation, finalized-only cart cleanup and guest access cookies.
- Use approved test data for payment/inventory smoke tests. Do not manufacture live
  orders, payments, Kuji draws or database writes as a deployment health probe.

## Before/after measurements

The November 16 audit observed about 3h38m of the 4h Hobby CPU allowance, roughly
2.8K/5K image transformations, 106K function invocations and 17.8GB-hours memory.
Recent CPU leaders were product details and homepage regeneration. Keep the
dashboard time range, environment and deployment attached to each comparison.

Record measurements before release, then after 6h, 24h, 72h and 7 days:

| Measurement | Compare |
| --- | --- |
| Fluid CPU | Absolute rolling usage and CPU per 1,000 comparable invocations, by route |
| Cache behavior | HIT/STALE/MISS/BYPASS, cold starts, homepage and static-page regeneration |
| Backend traffic | Collections/tags calls, shipping calls on visits that never open the cart |
| Error frequency | NEXT-J/B/G/H and NODE-Y by release, route, browser and relevant traffic |
| Latency | Same transaction grouping and p95 window; record sampling and sample counts |
| Images | Transformations, widths, formats and quality; compare actual display width/DPR |

The audit's 14-day sampled p95 values were 7.85s for `GET /products/[slug]`, 1.28s
for homepage, 943ms for backend home and 498ms for backend collections. Do not
subtract percentiles to estimate network latency or equate elapsed I/O with active CPU.

Use existing usage notifications and an operator-reviewed 95% CPU escalation.
Any actual pause notice requires immediate operator action. Current Vercel terms
restrict Hobby to personal/non-commercial use, so a commercial storefront should
have an approved suitable plan. Plan/billing changes and automatic spend-triggered
pausing require a separate decision; this patch does not apply them.

## Remaining evidence gates

- NEXT-B: the latest inspected rejection targeted `head > link`. New events attach
  only resource origin/path, rel/as and online state. Query/hash and credentials are
  omitted. Capture the failed resource/status before choosing an asset-skew/network
  fix. Do not suppress it or add automatic reload loops.
- NEXT-G: sampled public JSON-LD is valid. Its inline Safari frame has no confirmed
  application/extension/third-party attribution. Keep it captured; reproduce in clean
  Safari/WebKit with isolated scripts before changing markup or filtering noise.
- NEXT-H: historical SSR collections requests received backend 429s; current headers
  confirm a 300-request/300-second policy. Correlate future request IDs, safe response
  headers and backend logs before changing limiter identity or thresholds. Never
  trust arbitrary forwarded-IP headers or exempt unauthenticated marker headers.
- NODE-Y: one historical September DNS event, with no recent recurrence established.
  Recognize temporary DNS failures in existing bounded read retries; never replay
  checkout, payment, inventory or Kuji transactions automatically.
- Keep product caching, global metadata-streaming changes, crawler blocks, pool/index
  changes, image-loader replacement and new services deferred until supported by
  measurements. Preserve search/social crawlers and existing abuse protection.

Rollback frontend behavior through the previous verified deployment if session,
checkout, SEO or error-rate regressions appear. Reassess normalized CPU if caching
does not reduce consumption; do not report suspension risk as resolved from tests.

References: [Vercel Fluid accounting](https://vercel.com/docs/functions/usage-and-pricing),
[Hobby allowances](https://vercel.com/docs/plans/hobby),
[Vercel terms](https://vercel.com/legal/terms),
[Supabase SSR caching](https://supabase.com/docs/guides/auth/server-side/nextjs).

## Release checkpoint — November 16, 2026 (America/Edmonton)

Inspected authenticated Vercel, Sentry and Northflank during November 17,
04:18–04:35 UTC (November 16 in Edmonton). **No release has been approved or
deployed.** Reliability changes remain uncommitted in both repositories. The
local frontend `.next` output is a fixture build and must never be deployed;
the eventual Git production workflow must make a fresh provider build.

### Production identity and rollback references

| Component | Verified current production identity | Release status |
| --- | --- | --- |
| Frontend | `4455ba07fa9213416628f58483c05b470727b0d8`; `dpl_G5u2f6eap9sZZPazXAJErpMLUr9c` | Vercel READY; local remediation not released |
| Backend | `4187689f79d157c4581262b8079c8006916fc89a`; build `chilly-riddle-9045`; deployment `popbox-studio-node-6bb8c479b` | Northflank running, one of one instances; local remediation not released |

Frontend owner is `casupport-5451s-projects`, team
`team_LP08DTuuRGPTNOnzioOcmlxk`, project
`prj_oKVIg6frWISBYgfIGzDfY97zrclA`, Git repository
`LouisDev314/popbox-studio-next`, production branch `main`, Node `24.x`.
Public URL: [PopBox Studio](https://popboxstudio.com/).
Current immutable URL:
[frontend deployment](https://popbox-studio-next-l9evxx1vb-casupport-5451s-projects.vercel.app).

Vercel exposes Instant Rollback. Preserve the current verified deployment above
as the rollback reference for the upcoming change. Earlier READY rollback
candidate: `dpl_ATrzfGemDiZydhinFLw4NkpSmvNv`, SHA
`6c46a1238d35b2b32eabf216dd56aab97e4de9e3`. Provider candidacy alone does not
prove that an older build is functionally suitable.

Northflank team/project/service are `popbox-studio` / `popbox-studio-node` /
`popbox-studio-node`, Git repository `LouisDev314/popbox-studio-node`, branch
`main`, with CI and CD enabled. Production origin:
[backend service](https://p01--popbox-studio-node--67d549cxhwmn.code.run).
Vercel's verified `NEXT_PUBLIC_API_BASE_URL` matches that origin. Preserve
`chilly-riddle-9045` for rollback: its SHA matches the running service and contains
the existing variant-aware checkout. Do not select pre-variant artifacts.
Do not push either production branch before explicit release approval.

### Vercel capacity and eligibility

The refreshed [team usage dashboard](https://vercel.com/casupport-5451s-projects/~/usage)
was set to Last 30 Days, with displayed interval October 17, 10pm–November 16,
9pm. Its date picker identifies `America/Los_Angeles`; retain this timezone and
range when reproducing this dashboard snapshot. Usage is team-wide; the CPU
project breakdown attributes it to `popbox-studio-next`, across environments.

| Resource | Observed usage / allowance | Remaining |
| --- | --- | --- |
| Fluid Active CPU | 3h38m / 4h; progress value 90.9127% | About 21m49s CPU, 9.0873% |
| Function invocations | 106,098 / 1,000,000 | 893,902 |
| Fluid provisioned memory | 17.9 / 360 GB-hours | About 342.1 GB-hours |
| Image transformations | 2,829 / 5,000 | 2,171 |
| ISR writes | 72,451 / 200,000 units | 127,549 |
| CDN requests | 133,996 / 1,000,000 | 866,004 |

CPU divided by all invocations in that same usage window is approximately
123 seconds per 1,000 invocations. This is an aggregate across routes,
environments, deployments and cache/traffic mixes, not a comparable per-route
optimization result. No new deployment or rolling-window reset demonstrates a
saving. Approximately 9m49s additional CPU would reach the 95% warning threshold
(3h48m of 4h), before considering usage that ages out of the rolling window.

Separately, the Production Functions dashboard's Last 12 Hours snapshot
(displayed November 16, 10:24am–10:24pm) showed 354 invocations, 0% errors,
29.7% cold starts, 562ms p75 active CPU and 10.9% p75 CPU throttle. Rounded
route totals were `/`: 79 invocations / 42s CPU; `/products/[slug]`: 119 / 32s;
`/collections/[slug]`: 43 / 6s. Do not compare this short production-only
window directly to the team-wide 30-day ratio or project it into a guarantee.

Adjacent Last 12 Hours CDN/ISR views showed 927 CDN requests; homepage cached
96.5%, product detail and collection routes cached 0%, and image requests cached
100%. ISR showed 73 time-based revalidations and zero tag revalidations, with
74 writes for each homepage segment. Segment writes are not four independent
homepage regenerations. The aggregate Cached percentage is not a breakdown of
HIT/MISS/STALE/BYPASS. Exact cache-state rates still need a matching query/export.

- **Technical capacity: Hobby capacity uncertain.** Consumption remains below
  the allowance, but no representative post-release measurements exist.
- **Reliability: insufficient comfortable headroom.** About 9% CPU remains;
  deployment/regeneration and traffic spikes have no measured safety budget.
  Hold production deployment at this checkpoint rather than assume savings.
- **Eligibility: the intended commercial storefront is incompatible with Hobby.**
  Section 4 of the [current terms](https://vercel.com/legal/terms), updated
  October 19, 2026, limits Hobby to personal or non-commercial use. Low resource
  usage does not change this restriction.

Recommendation: move the commercial storefront to an appropriate paid plan,
with the operator's explicit billing decision, then release and measure.
No plan, billing, spend, firewall, crawler or traffic-policy settings were changed.

A November 17, approximately 04:38 UTC recheck still showed Hobby and the same
READY frontend production deployment/SHA. Refreshed CPU progress was 90.9395%
(about 21m45s remaining). The eligible-plan decision and explicit deployment
approval had not arrived; no production action followed this recheck.

### Sentry readiness and remaining verification

Verified organization: `popbox-studio`; frontend project `popbox-studio-next`
(`4511240261599232`); backend project `popbox-studio-node`
(`4511241103933441`). Existing local upload credential has only `org:ci`;
a separate read-only API credential was used for inspection. No new integration
or token was created by the agent.

Vercel already contained the correct `SENTRY_ORG=popbox-studio` and
`SENTRY_PROJECT=popbox-studio-next`, and an existing `SENTRY_AUTH_TOKEN`.
System Environment Variables access is enabled, supplying
`VERCEL_GIT_COMMIT_SHA`; a separate frontend `SENTRY_RELEASE` is unnecessary for
the normal Git workflow. The existing token was initially a readable Config.
The operator saved its conversion to Secret; the dashboard verified the same
key and all existing target environments, with a successful update notice.
The token value was not revealed or printed. No production deployment followed.
The saved Vercel credential's validity/scopes must still be established by the
actual fresh upload; local credential inspection alone cannot establish those.
Vercel Secret storage prevents reading it back but still provides it to builds
and runtime. Do not describe it as a platform-enforced build-only secret.

Frontend runtime environment defaults to `vercel-production`. The SDK injects
the configured Git SHA release into runtime initialization. Historical events
demonstrate an attribution gap: NEXT-J event
`0785aba45a834eca908f9ef3b2b28fc8` has no release/Debug IDs and three
`js_no_source` errors. NEXT-B event `bed787c2ee824116b6b6d6169a1f345f` also has
no release/Debug IDs. An existing Sentry release named `4455ba07...` has no
first/last event; its existence is not proof of production source-map mapping.

The backend now locally prefers trimmed `NF_DEPLOYMENT_SHA`, falling back to
trimmed `SENTRY_RELEASE`. Northflank already injects the former and currently
has a fixed `popbox-release` Sentry label. Three new tests cover SHA precedence
and empty/whitespace fallback. This release-related fix introduces no new secret.

After approval and deployment, verify both actual deployed SHAs, frontend chunk
Debug IDs and uploaded maps, then one controlled event originating in application
code. Confirm original source/line attribution and inspect redaction of customer
data. A DevTools-only error does not prove application source mapping. No new
test event or fixture source-map upload was sent during this checkpoint.

Concrete controlled-event procedure for the approved frontend build:

1. Create a fresh anonymous Playwright browser context, with no customer account
   or stored session. Before navigation, intercept and abort only
   `https://accounts.google.com/gsi/client` in that context.
2. Open `https://popboxstudio.com/account/sign-in`. A configured Google client ID
   is required. Do not enter credentials or submit a form. The existing deployed
   application creates `Google Identity Services failed to load.` in
   `lib/auth/google-identity.ts` (currently line 115) and captures it through
   `components/auth/google-auth-button.tsx` with `auth_provider:google` and
   `auth_stage:gis_script`. This fails only the isolated browser's script load;
   it changes no production authentication policy or commerce data.
3. In Sentry, find that one event by the new frontend SHA, environment
   `vercel-production`, the two tags and a narrow recorded UTC interval. Verify
   that its application frame resolves to the deployed source and matching Debug
   ID/artifact, inspect the event's redaction, and record its event ID here.
4. Close the context, removing the local interception. Keep the event visible as
   release-verification evidence. Do not suppress or resolve unrelated issues.

This procedure has been checked against the current code but has not been run;
the test event and source-map verification remain post-deployment gates.

Fixed Sentry baseline: **2026-11-03T04:27:35Z–2026-11-17T04:27:35Z**.
Frontend environment `vercel-production`; backend `production`.

| Baseline | Observed result |
| --- | --- |
| Frontend error events by issue | NEXT-B 52; NEXT-J 10; NEXT-G 1; NEXT-H 0; observed events lack release attribution |
| Backend error events | 0 in this fixed window |
| Frontend homepage | Sampled p95 1,261.63ms; n=139 |
| Frontend product detail | Sampled p95 7,352.80ms; n=59 |
| Backend home | Sampled p95 919.59ms; n=453 |
| Backend collections | Sampled p95 527.90ms; n=1,704 |

Latency uses the current spans dataset, `is_transaction:true`, with aggregate
extrapolation disabled. Retain that setting, units, exact route grouping,
sampling/sample counts and pagination when comparing. All five known issues
remain unresolved. NODE-Y has one lifetime occurrence (September 11, 2026)
and no recurrence in the fixed baseline. Zero recent occurrences do not prove a
fix, and raw event counts without comparable traffic are not normalized rates.

### Northflank hosting readiness

The running service has one instance, 0.1 shared vCPU / 256MB, and showed four
days uptime with zero restarts for the current pod. Two read-only HEAD requests
to `/health` and `/ready` returned 200. Existing logs show
`cleanupExpiredReservations` and `cleanupExpiredPendingOrders` starting and
completing every two minutes, including 2026-11-17 04:24 UTC. This establishes
current job activity, not startup/recovery verification of the unreleased patch.

All runtime-required environment names are present, including database,
Supabase/JWKS, Stripe/webhook, email, order-token pepper, production URL settings,
Sentry and `GOOGLE_ADDRESS_VALIDATION_API_KEY`. Secret values were not exposed.

**Required probe correction, prepared but not applied:** existing HTTP readiness
uses `/health` on port 3000; change only the path to `/ready`. Existing settings
are initial delay 5s, interval 60s, timeout 10s, failure threshold 3 and success
threshold 1. `/health` is process-only; `/ready` checks DB with a 3s deadline.
The existing interval/threshold can take minutes to remove an unhealthy instance.
No startup/liveness probe is configured. The patch itself exits after exhausted
warmup retries, so do not add DB-based liveness and create restart storms.

Northflank documents restarting an exited service process; its Kubernetes
deployment manages this service. Exact numeric restart backoff/limits are not
exposed in the inspected UI and remain unverified. Do not present Kubernetes
defaults as measured Northflank settings. The local startup suite verifies one
transient retry, exit on exhaustion, and exactly-once job/HTTP initialization
after recovery. DB warmup may take about 20.1s plus process overhead; preserve
adequate startup allowance. Cross-process advisory locks and per-process overlap
guards protect scheduled cleanup concurrency.

Probe changes are held for deployment approval because changing a Pod template
can roll instances. Do not click health-check Save or Resources Update & restart
as a supposedly read-only prerequisite. Preserve the current build and verify
restart/readiness and cleanup on the approved new build before releasing frontend.

The dashboard also displays an active provider security incident notice advising
rotation of user-defined credentials created before October 30. Their rotation
status was not established; the operator should review the linked
[Northflank incident](https://status.northflank.com/cmvv0rn5a092f14rutwccodpp).
No credential rotation or destructive database operation was performed here.

### Final local validation and operator monitoring

- Frontend Node 24.13.0 / corepack pnpm 10.30.2: `test:production` passed its
  full `pnpm check` (lint, 753 tests / 126 files and production fixture build),
  cache/invalidation/live-commerce checks, sitemap/outage recovery, and successful
  homepage retention after actual 301s expiry. Separate TypeScript checking
  passed, including after generated Next types. Browser runs: 33 passed, two
  intentionally skipped mobile keyboard cases, desktop/mobile/WebKit.
- Backend Node 24.15.0 / corepack pnpm 10.30.2: after the SHA attribution fix,
  `pnpm check` passed lint and 492 tests / 46 files; separate TypeScript and
  production build passed. Focused startup/Sentry tests: 13 passed.
- The full checks had no warnings/errors. Intentional fixture 503 traces, browser
  fixture teardown connection errors, fixture image notices and browser-tool
  color warnings are test-environment output, not production reliability evidence.
- Git whitespace checks passed. Pending diffs/untracked files in both repositories
  had zero matches against known local secret values; only `.env.example` is
  tracked. No production source-map/test-event success or CPU improvement is claimed.

Existing usage notification settings were retained. The actual Hobby Alerts
page requires Pro for custom alerts; do not claim a new automatic 95% alarm was
installed. Establish an operator check now at 90% and escalate by 95% (3h48m):
inspect route CPU, invocations, bots/crawlers and regeneration; distinguish traffic
from deployment effects, report headroom, and seek approval for billing or
significant traffic changes. Do not disable commerce, auth, monitoring or crawlers.

After an approved release, record an immediate baseline and checkpoints at +6h,
+24h, +72h and +7d. No future checkpoint has occurred or been scheduled. Use the
existing dashboards without generating traffic:

1. In Vercel [Functions](https://vercel.com/casupport-5451s-projects/popbox-studio-next/observability/vercel-functions),
   select Production and an explicit interval; record SHA, timezone, start/end,
   total/per-route CPU, invocations, errors, throttle and cold-start percentage.
   Compute `CPU seconds / invocations * 1000` using the same scope/window.
2. In the adjacent CDN Requests, ISR and Image Optimization views, use the same
   interval and record cache states where available, homepage segment revalidations
   and transformation counts. Record unavailable fields rather than invent them.
   Hobby retention may prevent later historical comparisons; save each checkpoint
   when available, preserving an equivalent pre-release comparison window.
3. In Sentry Errors, use `environment:vercel-production` and the frontend SHA;
   backend uses `environment:production` and its new SHA after this fix is released.
   Check all five issue identifiers and errors per comparable traffic volume.
4. In Sentry Traces, use `is_transaction:true` and the same environment/release
   filters. Group by the existing route/transaction names; record `count()` and
   `p95(span.duration)` with extrapolation disabled and sample/pagination context.
5. Append measured results here. The immediate release remains gated on the
   operator's eligible-plan decision and explicit backend-first deployment approval.

Additional references: [Sentry upload permissions](https://docs.sentry.io/api/permissions/),
[Next.js source maps](https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/),
[Vercel Secret/Config types](https://vercel.com/changelog/environment-variables-now-use-config-and-secret-types),
[Northflank health checks](https://northflank.com/docs/v1/application/observe/configure-health-checks),
[Northflank injected SHA](https://northflank.com/docs/v1/application/secure/inject-secrets),
[Vercel notification availability](https://vercel.com/docs/notifications).

## Cloudflare Workers migration verification — November 26, 2026

Production still serves through Vercel. The read-only [Cloudflare preview](https://popboxstudio-web.ca-support.workers.dev/)
is deployed as `popboxstudio-web` on the confirmed Workers Free account. Direct
OpenNext and vinext rendering exceeded the 10 ms Free CPU limit in route-level
telemetry. The SQLite Durable Object rendering candidate is in validation.
Production cutover and Vercel decommissioning remain pending.

### Production baseline

- Namecheap is authoritative for `popboxstudio.com`, with no DS record
  observed. Both storefront hostnames serve HTTPS. The apex returns a 307 to
  `www.popboxstudio.com`, and `/home` returns a 308 to `/`.
- The existing storefront DNS targets are apex `A 216.198.79.1` and `www CNAME
  0f09280bb0395d82.vercel-dns-017.com.` with approximately 30-minute observed
  TTLs. These are the public storefront records. Obtain a complete Namecheap
  export and confirm effective TTLs before any delegation change.
- Representative storefront pages returned server-rendered HTML and SEO metadata.
  The sitemap returned 109 URLs. Anonymous account and admin routes redirected
  to their sign-in flows.
- Median TTFB across three public samples per route was 194 ms for the
  homepage, 282 ms for a filtered listing, 295 ms for a collection and 537 ms
  for a Kuji detail page. Repeat at the same location and cache state. Use
  Workers telemetry for invocation CPU.

### Candidate

The candidate uses OpenNext `1.20.19`, Next.js `16.4.6` and Wrangler
`4.168.0` on Workers Free. OpenNext adapts the existing Next.js build,
so the app can retain App Router SSR, route handlers, rewrites and metadata.
Version 1.20.19 fixes a cookie-handling regression in the experimental Node.js
`proxy.ts` support. vinext uses a Vite reimplementation of the Next.js APIs
and is in beta. Static export cannot serve this app's authenticated routes,
request-time catalog or API rewrite. [OpenNext support](https://opennext.js.org/cloudflare) ·
[OpenNext release](https://github.com/opennextjs/opennextjs-cloudflare/releases/tag/@opennextjs%2Fcloudflare@1.20.19) ·
[Cloudflare vinext guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/).

The Worker uses Workers Static Assets, a KV namespace for Next.js incremental
cache data, two SQLite Durable Object classes for timed regeneration and tag
invalidation, and the Free Images binding for Supabase Storage image transforms.
On an Images quota error, the image route serves the original source through
OpenNext's existing allowlist. The Kuji video alone uses Worker-first routing to
support HTTP byte ranges required by Safari. `workers.dev` allows anonymous
catalog reads and omits production service credentials from the preview build.
Its pages carry `X-Robots-Tag: noindex`. [OpenNext caching](https://opennext.js.org/cloudflare/caching) ·
[Static Assets limitations](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/#range-requests).

### Preview results

- `pnpm check:ci` passed lint, 784 tests and the Next.js build and type check.
  The local production reliability suite passed taxonomy invalidation, live
  pricing, sitemap caching and last-good homepage ISR. Across Playwright fixture
  runs, all functional cases and four separate analytics consent checks passed.
  The full browser suite was not green in one run. Five old visual baselines
  differed by the same pixels on the original and migration builds, and dev
  reloads affected some runs.
- Public HTTPS checks passed for home, product listing and detail, collections,
  search, same-origin API reads, redirects, canonical and structured metadata,
  all 109 sitemap URLs, transformed WebP images and the video `206` byte range.
  Browser verification covered the Kuji product, inventory display and local
  cart add/remove. The preview rejected a write method and private routes.
- Wrangler reported 19,111 KiB uncompressed, 4,936 KiB gzip, fewer than 100
  asset files, and 309–390 ms startup across deploys. The largest asset was the
  8.5 MiB Kuji video. The dashboard
  showed 46 MB median and 57 MB P99 memory, zero CPU-limit and memory-limit
  errors, and 107 invocations in the sampled 24-hour window.
- In the follow-up sample, per-URL median CPU was 26 ms on home, 45 ms on the
  filtered listing, 60 ms on Kuji detail, 40 ms on the Featured collection,
  32 ms on search and 25 ms on the sitemap. P95 was 436, 316, 559, 174, 58 and
  250 ms respectively. Cloudflare can allow CPU rollover temporarily. Successful
  HTTP responses in a small test do not establish sustained operation at 10 ms.
  [Workers metrics](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/#cpu-time-per-execution).
- A deployed 25-second CPU profile during product renders showed time in the
  generated Next.js request pipeline, routing, cache initialization and garbage
  collection. OpenNext cache interception can help existing public cache hits.
  Dynamic catalog and private routes still require live request processing.
  [Workers profiling](https://developers.cloudflare.com/workers/observability/profiling-in-production/).
- Median network TTFB across five follow-up requests per route was 371 ms for
  home, 222 ms for the listing, 274 ms for the collection and 527 ms for Kuji
  detail. These are network timings from one client. The CPU finding prevents
  a sustainable production traffic estimate.

### Vinext evaluation

The official checker scored the baseline project 97% compatible and flagged
partial support for remote images and Sentry build integration. A scratch
build used vinext `1.4.7`, React `19.3.1` and Node `24.22.1`. The separate
[vinext preview](https://popboxstudio-vinext-eval.ca-support.workers.dev/) uses
the same read-only boundary and a separate key prefix in the existing Free KV
namespace. Wrangler reported 6,042 KiB uncompressed, 2,419 KiB gzip, 191 asset
files and 50 ms startup. [Vinext compatibility guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/).

| Public route | OpenNext median CPU | OpenNext P95 CPU | Vinext median CPU | Vinext P95 CPU |
| --- | ---: | ---: | ---: | ---: |
| Homepage | 26 ms | 436 ms | 11 ms | 316 ms |
| Filtered listing | 45 ms | 316 ms | 62 ms | 411 ms |
| Kuji detail | 60 ms | 559 ms | 68 ms | 89 ms |
| Featured collection | 40 ms | 174 ms | 44 ms | 56 ms |
| Search results | 32 ms | 58 ms | 25 ms | 34 ms |
| Sitemap | 25 ms | 250 ms | 2 ms | 24 ms |

The vinext sample returned 200 on the public SSR and API routes, 109 sitemap
entries, 206 for the video range, and 404 for authenticated paths in read-only
mode. The 38 sampled invocations produced zero CPU or memory limit errors. P99
memory was 47 MB. Median network TTFB was 229 ms for home, 248 ms for the
filtered listing, 233 ms for Featured and 545 ms for Kuji detail. Both adapters
exceeded the CPU threshold on required live routes. The production build,
GitHub integration, DNS change and Vercel disconnection remain gated.

Netlify Free is a separate $0 candidate for evaluation. It supports dynamic
Next.js and caps usage at 300 credits per month. Confirm traffic headroom and
the existing 5 MiB admin upload path against Netlify Functions' roughly 4.5 MB
effective binary request limit. [Netlify Next.js support](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/) ·
[Netlify pricing](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/) ·
[Netlify Functions limits](https://docs.netlify.com/build/functions/configuration/).

### SQLite Durable Object renderer

Workers Free supports SQLite Durable Objects with a default 30-second CPU
allowance per invocation. A thin Worker forwards the original request stream
to an object and returns its response. OpenNext runs inside the object with
the existing Next.js proxy, cache, routes, image optimization and server
rendering. Static assets and Kuji video stay outside the renderer. The current
candidate uses one fixed Durable Object identity for all render requests.
Request data cannot create another object. [Workers CPU limits](https://developers.cloudflare.com/workers/platform/limits/#cpu-time) ·
[Durable Object limits](https://developers.cloudflare.com/durable-objects/platform/limits/).

The deployed single-renderer probe served the public listing, products,
collections, search, API reads, all 109 sitemap URLs and the Kuji video byte
range. The matching Cloudflare version reported 51 Durable Object fetches with
38 ms median, 206 ms P95 and 1,282 ms maximum CPU. Only one matching stateless
gateway event was recorded, at 2 ms. A larger gateway sample and the updated
four-shard preview are still required. The first three parallel cold routes
took 2.9–3.8 seconds to first byte. Follow-up samples must verify cold and warm
latency with the final topology.

The four-shard candidate built with Turbopack and OpenNext, seeded the isolated
KV prefix, and deployed as `30298f40-1a8d-4c0c-bfab-6b56419a292c`. Public SSR,
metadata, API, sitemap, preview isolation, byte range and WebP checks passed.
All 70 sampled route responses returned HTTP 200. Median network TTFB was 269 ms
for home, 321 ms for the listing and Featured collection, and 536 ms for the
Kuji detail. The first parallel requests after deploy took 2.4–2.9 seconds to
first byte.

Version telemetry showed stateless CPU P50 1 ms, P95 3 ms and maximum 11 ms.
The one stateless fetch over 10 ms was a successful image transformation.
Durable Object fetch CPU was 63 ms at P50, 472 ms at P95, and 1,029 ms maximum.
The updated preview `40dc4bce-2a97-4424-8b5d-090179bf4973` moves image
optimization and its quota fallback into the renderer. It reported 19,114 KiB
uncompressed, 4,937 KiB gzip and 272 ms startup. Production domain routes remain
absent.

The updated preview passed the same storefront checks, all 70 network samples
and 24 WebP responses across 12 image variants. The median network TTFB was
290 ms for home, 231 ms for listing, 269 ms for Featured and 532 ms for Kuji
detail. Median image TTFB was 249 ms. These timings come from one test client.

After Cloudflare's deferred object update window, the image-rendering version
recorded stateless CPU P50 1 ms, P95 3 ms and maximum 3 ms. Its Durable Object
CPU was 37 ms at P50, 375 ms at P95 and 1,260 ms maximum. A separate workerd
fixture injected the Free Images quota error into the real optimizer. It
served the original asset with a matching SHA-256 digest.
When working from Cloudflare Logs, match the renderer's own script version
because warm objects can run the preceding version for up to five minutes.
[Durable Object code updates](https://developers.cloudflare.com/durable-objects/deployments/durable-objects-code-updates/).

Workers Free quotas are shared across renderer, queue and tag classes. These
include 100,000 Durable Object requests and 13,000 GB-seconds per UTC day.
Duration is billed at 128 MB of allocated memory per active object. Compare
the account's change in usage with a quiet baseline after representative
journeys, including time spent active after responses. Measure with production
Sentry configuration present. Confirm headroom against expected live traffic
and both Worker and Durable Object budgets before cutover. [Durable Object pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) ·
[Durable Object telemetry](https://developers.cloudflare.com/durable-objects/observability/metrics-and-analytics/).

The Free dashboard showed 13.1 GB-seconds across the account after the
single-renderer probe. A later dashboard sample showed 228 GB-seconds and 119
requests in the renderer namespace, with 229 GB-seconds across the account.
The last-24-hour namespace view later showed 230 requests, zero errors and P99
memory between 43 and 58 MB on the four active shards. The usage and instance
views update at different times. Keep measuring billed duration after the
objects go idle and during realistic request patterns before projecting
sustainable traffic.

After the four-shard preview sat overnight, Cloudflare reported about 5,200
GB-seconds for 306 renderer requests and one renderer error. The four active
shards showed no invocation after the final test batch. This billing sample
prevents projecting four-shard production usage from HTTP response times.
At 128 MB of allocated memory, one fixed renderer can use at most about 11,059
GB-seconds per UTC day. This leaves about 1,941 GB-seconds for the queue, tag
cache and other account objects. Their usage still needs independent checks.

The single-renderer preview `8eacb684-21ad-484d-ba1d-487c6e2341bd` reported
286 ms startup. All 70 route samples and 24 WebP responses passed again.
A warm six-client burst returned 24 of 24 HTTP 200 responses at 442 ms median,
719 ms P90 and 1.09 seconds maximum TTFB. Initial parallel requests after
deploy took 3.6–5.0 seconds. Warm home, listing, Featured collection and Kuji
detail medians were 430, 360, 447 and 703 ms. A separate fresh Vercel check
from the same workstation measured respective warmed medians of 205, 286,
294 and 516 ms. The homepage had one cache hit and four stale responses on
Vercel, and the three other routes returned cache misses. Both production
hostnames passed TLS validation and the apex returned the expected 307 to
`www`.

The single renderer logged 132 requests and zero errors, with P99 isolate
memory of 84.39 MB. Stateless CPU was 1 ms at P50 and 2 ms at P95 and maximum.
Renderer CPU was 23 ms at P50, 155 ms at P95 and 1,881 ms maximum. The account
dashboard then showed about 5,280 GB-seconds for the UTC day, including the
earlier four-shard tests. At that snapshot the queue and tag cache accounted
for 5.36 and 1.06 GB-seconds, respectively.

The mobile browser found an inline `next-themes` error from Wrangler's function
name preservation. Both Wrangler configurations now use `keep_names: false`.
Version `002bcc89-56c6-48ae-8284-6c3b7721a8c0` deployed with this setting and
reported 18,382 KiB uncompressed, 4,830 KiB gzip and 270 ms startup. The
homepage and Kuji detail rendered the bootstrap without the broken helper.
Chromium applied a saved dark theme and reported zero page exceptions on both.
[OpenNext theme script fix](https://opennext.js.org/cloudflare/howtos/keep_names).

The [Vercel baseline](#vercel-capacity-and-eligibility) averaged 3,537 function
invocations per day across team environments over 30 days. A separate production
window recorded 354 invocations in 12 hours. The current Vercel connector did
not return aggregate metrics. Measure peak production demand and Cloudflare
invocations per journey before extrapolating from that historical baseline.

Synthetic local account and admin checks exercised valid and expired sessions
on both direct OpenNext and Durable Object paths. Those checks found that the
HTTP transport folded multiple guest-order cookies and that the authenticated
admin shell returned a shared-cache directive. The guest route now uses Axios
with explicit manual redirects and a transport that keeps separate cookies.
The Worker sets `private, no-store` on protected routes, authenticated API reads
and responses that set cookies.

A local workerd fixture exercised the gateway and SQLite renderer with concurrent
sessions and streamed responses. A full Next.js Webpack fixture was packaged
by OpenNext and ran in workerd. It verified authenticated session isolation,
private cache headers, denied admin requests, and a 5 MiB admin upload with an
intact payload through the real Next.js rewrite to a synthetic backend. The
guest handoff now resolves the destination from the original order or ticket
path if a rewrite preserves the browser URL. Regression checks cover both
guest URLs and explicit handoff URLs. Local tests verified a same-origin 307,
separate cookies and `private, no-store`. Hosted validation remains pending.

The OpenNext cache queue uses a private Worker loopback to send trusted
revalidation headers to Next.js. Public requests have these headers stripped.
In workerd, the actual queue refreshed the homepage in read-only mode, and
Next rejected an incorrect revalidation token. An in-process Sentry endpoint
received an error envelope and the synthetic release for a storefront upstream
failure. Hosted Sentry delivery, traces and source-map matching remain gated.

The local Workers candidate completed standard and Kuji checkout in the
dedicated PopBox Launch Rehearsal Stripe sandbox. Both receipts were confirmed
as test mode. The isolated backend processed one signed webhook per checkout
and converted each inventory reservation. The standard browser displayed its
guest order. The Kuji browser revealed the one ticket issued to the test order.
The rehearsal used an isolated PostgreSQL instance and suppressed email.

After these changes, `pnpm check` passed ESLint, 802 Vitest tests, and the
Turbopack production build and TypeScript check with source-map upload disabled.
The registrar's current session stopped at sign-in. The full Namecheap zone
inventory and rollback export need an authenticated registrar session before
any nameserver or DNS cutover.

### Deployment and environment

For a local Workers build, use `pnpm build:cloudflare` followed by
`pnpm preview:cloudflare`. Manual deployment from a built artifact uses
`pnpm deploy:cloudflare`. Use an isolated Wrangler configuration with no custom
domain routes for preview deployments. Set `POPBOX_PREVIEW_READ_ONLY=true` in
that configuration and set `NEXT_INC_CACHE_KV_PREFIX=renderer-preview` for
both cache seeding and runtime. Use the public catalog API, a dummy Supabase
publishable key, and empty Stripe, Google, analytics and Sentry build values in
this mode. The tracked production config sets the preview flag to `false` and
uses its own cache prefix. These explicit values replace the corresponding
preview settings when `keep_vars` preserves other dashboard-managed values.
The `workers.dev` host still enforces read-only behavior.

Native Workers Builds shows `LouisDev314/popbox-studio-next` connected to
`popboxstudio-web` on `main`. Production builds and preview branch builds are
both disabled. The production build configuration was saved and verified with
repository root `/`, `NODE_VERSION=24.22.1`, `SKIP_DEPENDENCY_INSTALL=1`, and
the repository pin `pnpm@10.30.2`. Its build command is
`corepack pnpm install --frozen-lockfile && corepack pnpm build:cloudflare`,
and its deploy command is `corepack pnpm deploy:cloudflare`. The masked Sentry
upload token and the existing Vercel GA4 identifier were verified in the
production build settings. Public `NEXT_PUBLIC_*` values that the server reads
through its runtime environment must also be set on the Worker before cutover.
[Build image](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/).
Manage storefront custom domains in the dashboard after DNS validation. The
build credential needs access to deploy the Worker and seed its KV cache.

- Set the public `NEXT_PUBLIC_*` values from [the environment reference](../README.md#environment-variables)
  as build variables. Set `NEXT_PUBLIC_SITE_URL` explicitly to
  `https://www.popboxstudio.com`. Also set the backend URL, canonical URL,
  Supabase URL and publishable key, storage bucket, storefront flag and Sentry
  DSN as Worker runtime variables where used by server-side resolvers.
- Set `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_ENABLE_BUILD=true` in the
  production build environment. Store `SENTRY_AUTH_TOKEN` as a Build Secret.
  `WORKERS_CI_COMMIT_SHA` identifies the release in native Builds. Set
  `SENTRY_RELEASE` for an authorized manual build that uploads source maps.
- Use Workers & Pages → `popboxstudio-web` → Metrics and Observability for CPU,
  memory, status, and the deployment version. Preserve Sentry and consent-gated
  GA4. Vercel Analytics and Speed Insights continue to load on Vercel only.
  Cloudflare invocation query strings are redacted and production invocation
  logging is disabled in the repository default.
  [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) ·
  [OpenNext environment variables](https://opennext.js.org/cloudflare/howtos/env-vars).
- Workers Logs on Free includes 200,000 events per day through November 30,
  2026. Starting December 1, the shared Free observability allowance is 0.5 GB
  of ingestion per day, with seven-day retention. Restrict diagnostic sampling
  to the isolated preview and check aggregate ingestion before promotion.
  [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/#pricing) ·
  [Observability pricing](https://developers.cloudflare.com/observability/pricing/).

### DNS cutover sequence

After the pre-cutover gates pass, compare the complete Namecheap zone against
the Cloudflare Free zone before changing nameservers. Retain the original
Vercel targets during delegation and verify authoritative answers, HTTPS and
unchanged backend and email records on the active Cloudflare zone.

Confirm the edge certificate covers `popboxstudio.com` and `www.popboxstudio.com`.
At cutover, replace the existing `www` CNAME with the Worker Custom Domain
and verify HTTPS before changing the apex. Enable a Single Redirect for
`http.host eq "popboxstudio.com"` with status 307, dynamic target
`concat("https://www.popboxstudio.com", http.request.uri.path)`, and query
preservation. Point the apex at a proxied `A` record for `192.0.2.0` so Cloudflare
handles the redirect without invoking the storefront Worker. Keep the Vercel
domain mappings until post-cutover verification passes. [Worker custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) ·
[Apex redirect example](https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-root-to-www/).

### Rollback boundaries

Record the validated production Worker version and Vercel targets before
cutover. Router changes, environment changes, and DNS changes need separate
rollback steps. For code rollback within the same Durable Object class layout,
use `pnpm exec wrangler rollback <verified-version-id> --name popboxstudio-web`
and verify the deployed version and storefront after the rollback. Cloudflare
allows rollback within the 100 newest retained versions and preserves bindings.
The creation of `PopBoxNextRenderer` in `renderer-v2` prevents a version rollback
to any earlier class layout. Deploy class lifecycle changes while the Worker is
isolated. If no verified post-migration Worker version can serve production,
restore the recorded Vercel DNS targets as described below. [Workers rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).

### Pending gates

- [x] Build and test the Worker locally and deploy an isolated preview. Verify
  public storefront, API rewrites, image delivery, SEO and redirects.
- [ ] Verify cookie refresh, guest-order cookie handoffs, on-demand admin invalidation,
  secure cache headers and Sentry event/source-map matching on a hosted candidate.
  Use fixtures or an isolated test environment for authenticated and commerce
  mutations, including checkout and inventory. Record coverage gaps.
- [ ] Verify homepage ISR, taxonomy and sitemap freshness, stale fallback during
  an upstream outage, and cache quotas. Prove account, cart, admin and checkout
  data stay out of shared caches. Measure cold sitemap subrequests against the
  Free limit. Monitor the shared KV allowance of 100,000 reads and 1,000 writes
  per day. Confirm image optimization and fallback delivery when Free image
  transformation quota is exhausted. R2 requires a subscription and is outside
  the $0 deployment scope. [OpenNext caching](https://opennext.js.org/cloudflare/caching) ·
  [Workers KV limits](https://developers.cloudflare.com/kv/platform/limits/) ·
  [Images pricing](https://developers.cloudflare.com/images/pricing/) ·
  [R2 setup](https://developers.cloudflare.com/r2/get-started/).
- [ ] Pass the Free-tier CPU gate and measure Worker invocations per journey.
  The direct adapters exceeded the 10 ms CPU requirement. Verify the final
  Durable Object gateway separately and measure shared compute usage. Track
  startup, memory, error rate and account usage. Workers Free documents
  10 ms CPU, 128 MB memory and 50 subrequests per invocation, 100,000 dynamic
  requests per day, 64 MiB uncompressed code, one second startup and 20,000
  static asset files up to 25 MiB each. The size cap applies to the uncompressed
  bundle. Record raw and gzip size and estimate traffic headroom from observed
  journeys. [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) ·
  [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).
- [ ] Verify an actual GitHub-triggered build and deploy from `main` through the
  existing repository process. Verify duration and failure visibility against
  the Free limit of 3,000 build minutes per month, one concurrent build and
  a 20-minute timeout per build. Keep preview builds isolated from production
  secrets and mutations. [Workers Builds limits](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/).
- [ ] Record the full current DNS zone, TTLs, Vercel domain mappings and rollback
  targets. Compare the imported zone before changing delegation and preserve
  backend, email and verification records. Keep Vercel serving until all gates
  pass. Then attach the Worker to the active zone and verify HTTPS and apex-to-www
  behavior. On a critical regression, detach the Worker domain routes and restore
  the recorded Vercel targets and proxy state. Restore prior nameservers if
  delegation itself is faulty. [Worker custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
- [ ] Verify production functionality, SEO, DNS, TLS, backend and email DNS,
  Sentry, and Workers usage and errors after cutover. Disconnect automatic Vercel
  deployments only after successful verification and retain rollback information.
