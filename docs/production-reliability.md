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
