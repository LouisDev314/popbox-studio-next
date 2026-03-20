# Design System Specification: Editorial Operationalism

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Precision Curator."** 

While the functional requirement is a high-density admin dashboard, the visual execution rejects the cluttered "template" look. We move beyond standard SaaS aesthetics by treating data as editorial content. The system balances the utilitarian efficiency of a startup command center with the sophisticated restraint of a high-end digital gallery. We achieve this through "The Breath of Data"—using intentional white space (negative space) and tonal layering to guide the eye, rather than heavy-handed lines and boxes.

---

## 2. Colors & Surface Architecture
We utilize a sophisticated Material-based palette that evolves the user's pink and slate requirements into a multidimensional tonal system.

### The "No-Line" Rule
**Explicit Instruction:** Sectioning via 1px solid borders is prohibited for primary layout divisions. 
Structural boundaries must be defined through background color shifts. For example, a sidebar using `surface_container_low` (#F2F4F6) sits flush against a main content area of `surface` (#F7F9FB). This creates a "soft edge" that feels integrated, not boxed in.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, physical sheets of fine vellum.
- **Base Layer:** `surface` (#F7F9FB) for the primary application background.
- **Secondary Workspaces:** `surface_container_low` (#F2F4F6) for sidebars or secondary navigation.
- **Primary Content Cards:** `surface_container_lowest` (#FFFFFF) to provide a crisp, high-contrast lift for data tables and forms.
- **Active Overlays:** `surface_bright` for interactive elements that need to "pop" against the base.

### The "Glass & Gradient" Rule
To elevate the "PopBox Studio" brand, use a subtle **Signature Gradient** for primary CTAs: a linear transition from `primary` (#8A486F) to `primary_container` (#F9A8D4) at a 135-degree angle. This adds "visual soul" and depth. For floating modals or search bars, apply a `backdrop-blur` of 12px over a semi-transparent `surface_container_lowest` (85% opacity) to create a premium glassmorphism effect.

---

## 3. Typography: The Editorial Scale
We use **Inter** as our typographic backbone, but we apply it with high-contrast weight distribution to create a clear information hierarchy.

| Level | Token | Size | Weight | Intent |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-md` | 2.75rem | 700 (Bold) | Hero metrics and large impact numbers. |
| **Headline**| `headline-sm` | 1.5rem | 600 (Semi-Bold) | Section headers and primary page titles. |
| **Title**   | `title-sm` | 1.0rem | 500 (Medium) | Card titles and sub-section labeling. |
| **Body**    | `body-md` | 0.875rem | 400 (Regular) | Standard data entry and paragraph text. |
| **Label**   | `label-sm` | 0.6875rem | 600 (Bold) | Functional metadata, table headers (All Caps). |

**Note:** Pair `on_surface_variant` (#514349) with `label-sm` for table headers to create an authoritative, "muted but clear" metadata layer.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are a fallback, not a standard. We communicate depth through **The Layering Principle**.

- **Ambient Shadows:** When a "floating" effect is mandatory (e.g., a dropdown or popover), use an extra-diffused shadow: `box-shadow: 0 20px 25px -5px rgba(25, 28, 30, 0.04), 0 10px 10px -5px rgba(25, 28, 30, 0.02)`.
- **The "Ghost Border" Fallback:** If accessibility requires a border (e.g., in high-contrast mode), use the `outline_variant` (#D5C1C9) at **20% opacity**. Never use 100% opaque borders for interior layout.
- **Focus States:** Active input fields or focused buttons should utilize a 2px outer glow of `primary_fixed_dim` (#FFAEDA) to simulate a soft light source.

---

## 5. Component Strategy
Efficiency is found in the spacing scale, not in dividers.

### Buttons & Chips
- **Primary Button:** Gradient fill (`primary` to `primary_container`), `on_primary` text, `lg` (0.5rem) corner radius.
- **Filter Chips:** `surface_container_high` (#E6E8EA) background, no border, `full` (9999px) radius. Transition to `primary_container` (#F9A8D4) when active.

### High-Density Tables
- **Spacing:** Use spacing scale `3` (0.6rem) for vertical cell padding to maintain density without feeling cramped.
- **Separation:** Forbid horizontal divider lines. Distinguish rows using a subtle `surface_container_low` hover state or alternating tonal shifts.
- **Badges:** Status badges use a "soft-fill" approach.
    - *Active:* `tertiary_fixed` (#C1F0A4) background with `on_tertiary_fixed_variant` text.
    - *Pending:* `secondary_container` background with `on_secondary_container` text.
    - *Error/Cancelled:* `error_container` background with `on_error_container` text.

### Form Sections
- **Inputs:** `surface_container_lowest` (#FFFFFF) background with a `px` (1px) `outline_variant` border at 40% opacity.
- **Focus:** Border transitions to `primary` (#8A486F) with a soft `primary_fixed` glow.

---

## 6. Do's and Don'ts

### Do
- **Use Intentional Asymmetry:** In the dashboard, align primary metrics to a 12-column grid but allow secondary "Insights" cards to break the vertical rhythm with unique heights.
- **Embrace White Space:** Use spacing scale `8` (1.75rem) or `10` (2.25rem) between major modules to let the data "breathe."
- **Nester Surfaces:** Place a white card (`surface_container_lowest`) on a light gray sidebar (`surface_container_low`) to highlight a "Pro Tip" or "Search" area.

### Don't
- **Don't Use Dividers:** Never use a solid line to separate table rows or sidebar items. Use space and color.
- **Don't Use Pure Black:** Ensure all text remains `on_surface` (#191C1E) or `on_surface_variant` (#514349) to maintain a soft, premium feel. Pure black is too harsh for an operational environment.
- **Don't Over-Round:** Keep corner radii at `md` (0.375rem) or `lg` (0.5rem). Avoid "pill" shapes for buttons (except chips) to keep the system feeling "Startup-Professional" rather than "Consumer-Playful."