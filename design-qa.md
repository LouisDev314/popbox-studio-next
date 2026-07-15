# Customer authentication and account history design QA

## Reference comparison

- Compared the supplied directional board with the stabilized desktop sign-in capture in one visual review.
- Preserved the reference's split composition, compact form density, mobile image removal, and restrained state hierarchy.
- Kept PopBox Studio's real blush primary, warm surfaces, storefront header, typography, controls, image asset, and footer instead of copying the reference brand or artwork.
- Confirmed the desktop visual uses an approximately 54/46 image/form split and a vertically centered `max-w-md` form without a floating card.

## Responsive review

- Desktop auth screenshots reviewed at 1440 x 1000 for sign-in, sign-up, and forgot-password.
- Mobile auth screenshots reviewed at 390 x 844 for the same routes.
- Automated overflow checks passed at 320, 375, 390, and 768 pixels.
- The mobile navigation keeps the existing action row and places the account action after the navigation and collection sections in normal flow.

## Interaction and accessibility review

- Verified Google is the first auth action.
- Verified the password visibility control changes the input from `password` to `text`.
- Verified the mobile menu opens, exposes the signed-out account action, and closes with Escape.
- Verified the reviewed auth page has no horizontal overflow, browser console errors, or hydration warnings after the shared auth hydration fix.
- Confirmed decorative auth artwork uses an empty alt attribute and interactive controls retain semantic roles and visible focus styles.

## Automated visual coverage

- Checked-in Playwright baselines cover desktop and mobile sign-in, sign-up, and forgot-password states.
- Protected-route redirects, callback safety, checkout handoff, compact-width overflow, status mapping, item counts, and ticket masking/normalization are covered by the checked-in automated suites.
- Customer-data states use dedicated loading, empty, retry, conflict, unavailable, pagination, detail, and ticket components and remain available for live backend smoke testing with a configured customer fixture.

final result: passed
