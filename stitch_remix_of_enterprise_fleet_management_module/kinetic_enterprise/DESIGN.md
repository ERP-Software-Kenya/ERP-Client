---
name: Kinetic Enterprise
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e5'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fe'
  surface-container: '#ededf9'
  surface-container-high: '#e7e7f3'
  surface-container-highest: '#e1e2ed'
  on-surface: '#191b23'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3039'
  inverse-on-surface: '#f0f0fb'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#faf8ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ed'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-margin: 24px
  gutter: 16px
  card-padding: 20px
  section-gap: 32px
---

## Brand & Style

This design system is engineered for high-consequence enterprise environments where clarity, speed of data ingestion, and professional reliability are paramount. The aesthetic follows a **Corporate / Modern** movement, characterized by a structured layout, precise geometric alignment, and a sophisticated interplay of light and dark surfaces.

The visual language communicates authority and efficiency. It avoids decorative flourishes in favor of functional density. By utilizing a "Systematic Premium" approach, the UI evokes an emotional response of control and precision, essential for vehicle fleet logistics and transportation management.

## Colors

The palette is derived from high-contrast professional environments. The **Brand Blue** acts as the primary action color, used sparingly for critical CTAs and active states to maintain focus. 

- **Primary:** High-visibility blue for navigation highlights and primary buttons.
- **Surface Strategy:** In light mode, backgrounds utilize a subtle cool gray to reduce eye strain, while cards remain pure white. In dark mode, a deep slate background provides depth, with cards stepping up to a slightly lighter gray for clear layering.
- **Semantic Palette:** Success, Warning, and Danger colors are calibrated for high legibility against both light and dark surfaces, ensuring fleet status alerts are immediately recognizable.

## Typography

The design system utilizes **Inter** for its exceptional legibility in data-dense interfaces. A strict hierarchical scale ensures that metrics and KPIs are prioritized while secondary meta-data remains readable but unobtrusive.

For numerical data within tables and charts, **JetBrains Mono** or a tabular lining variant of Inter is recommended to ensure columns of figures align vertically, facilitating rapid comparison of vehicle IDs, timestamps, and fuel metrics. Use `label-caps` for table headers and small category descriptors to provide structural contrast.

## Layout & Spacing

The layout is built on a rigorous **8px grid system**. This spacing rhythm dictates all margins, paddings, and component heights, creating a predictable visual cadence.

- **Grid Model:** A 12-column fluid grid is used for dashboard layouts. On desktop, sidebars are fixed at 260px, while the main content area expands.
- **Density:** While the layout is spacious, internal component spacing (like within data tables) can be tightened to 4px increments to maximize information density without sacrificing clarity.
- **Breakpoints:** 
  - **Desktop (1280px+):** Full 12-column view with permanent sidebar.
  - **Tablet (768px - 1279px):** Sidebar collapses to icons; 8-column content grid.
  - **Mobile (<767px):** Single column reflow; 16px horizontal safe-margins.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Ambient Shadows**. Instead of heavy borders, the system uses subtle shifts in background color and soft shadows to lift interactive elements.

- **Level 0 (Background):** The lowest layer. Subtle Gray (Light) or Deep Slate (Dark).
- **Level 1 (Cards/Panels):** Raised via a soft, diffused shadow (`0px 4px 12px rgba(0,0,0,0.05)` in light mode).
- **Level 2 (Modals/Dropdowns):** Higher elevation with increased shadow spread to indicate temporary focus.
- **Dark Mode Depth:** In dark mode, elevation is primarily communicated through color stepping (backgrounds getting lighter as they "get closer" to the user) rather than shadows, which are less visible.

## Shapes

The shape language is controlled and modern. A standard **12px (0.75rem)** radius is applied to all primary containers and cards to soften the industrial nature of the data. Smaller components like buttons and input fields utilize a **6px - 8px** radius to maintain a crisp, professional appearance. 

Status badges and tags use a fully rounded (pill) shape to distinguish them from interactive buttons and structural containers.

## Components

### KPI Cards
Display primary metrics using `display-lg` typography. Include a secondary "trend" indicator (Success Green or Danger Red) with a small inline icon. Use a subtle 1px border (`#E2E8F0` light / `#334155` dark) to define the container.

### Data Tables
Tables are the core of the ERP. Use `body-sm` for row content. Headers should be `label-caps` with a subtle gray background. Implement "Zebra Striping" only on hover to maintain a clean look. Status badges within tables must have a low-opacity background tint of their semantic color for high scannability.

### Charts & Analytics
Line and Bar charts should use the Primary Blue for the main data series. Use thin, 1px dashed grid lines in a very light neutral. Tooltips must be dark-themed regardless of the system mode to provide high-contrast pop-outs.

### Map Interfaces
Full-screen maps should utilize a custom "Silver" or "Dark" map style to match the UI. Overlays (Vehicle pins, route lines) should use high-contrast primary colors. Controls are placed in Level 2 elevated floating panels.

### Split Layouts
For assignment tasks, use a 40/60 vertical split. The left pane (Master list) uses a subtle border-right, while the right pane (Detail/Action) contains the primary functional forms.