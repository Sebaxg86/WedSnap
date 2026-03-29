# WeddVue Stitch Prompt

This file contains a copy-paste-ready prompt set for Google Stitch.

Recommended workflow:

1. Start with the master prompt.
2. Let Stitch generate the first pass.
3. Refine one screen at a time with the screen-specific prompts below.

## Master Prompt

```text
Design a premium wedding web app called WeddVue.

This is not a generic tech product. It should feel intimate, elegant, romantic, calm, and timeless, like a luxury wedding editorial or a high-end fashion magazine spread.

The product flow is:
- Public landing page for couples
- Authentication page for sign in or account creation
- Private dashboard where a couple can create and manage wedding events
- Event workspace where they configure tables and generate QR codes
- Guest upload page that is opened only through QR codes placed on wedding tables

The entire UI must use Spanish copy.

Visual direction:
- minimal, elegant, romantic, timeless
- inspired by high-end fashion editorials, Vogue-like
- strong use of whitespace
- soft, calm, refined visual tone
- centered composition
- vertical flow
- large spacing between sections
- minimal visual noise

Color palette:
- off-white and ivory backgrounds
- charcoal and soft gray text
- muted beige and muted olive accents
- no saturated colors
- no vibrant gradients
- no bright blue, purple, or flashy product colors

Typography:
- elegant high-contrast serif for headings
- script font used very sparingly for emotional emphasis only
- clean sans-serif for labels, body text, buttons, and inputs
- generous letter-spacing

Components:
- soft rounded corners
- subtle borders and soft shadows
- premium-looking calm buttons
- simple elegant inputs
- cards should feel editorial and refined, not dashboard-heavy

Imagery:
- warm golden-hour wedding photography
- emotional candid moments
- soft depth of field
- never stock-photo-corporate

Motion:
- subtle fade only
- smooth, calm transitions
- avoid playful or flashy animations

Important UX direction:
- hide technical information from end users
- do not show tokens, slugs, bucket names, internal system details, traceability data, or implementation language
- keep copy emotionally clear and concise
- every screen should feel welcoming and calm on mobile, especially iPhone

Screen goals:

1. Landing page
- Elegant hero section with romantic imagery or soft editorial background
- Main CTA: “Me voy a casar”
- Secondary CTA: “Ya tengo cuenta”
- Short value proposition focused on preserving memories from guests
- Explain simply that guests scan a QR and upload photos privately
- No technical language

2. Authentication page
- Beautiful, minimal sign in / create account layout
- Should feel private, calm, and premium
- Reduce visual clutter
- Focus on email, password, and one strong CTA

3. Dashboard
- Private space for a couple to see and create events
- Clean overview of their events
- Strong primary action to create a new event
- Avoid dense dashboard styling
- Should feel like a private atelier, not enterprise software

4. Event workspace
- Screen for managing one wedding event
- Let the couple set up tables and QR codes
- Present table cards elegantly
- Each table card should allow naming the group or family and managing the QR
- QR-related actions should feel simple and polished
- Avoid showing raw token strings by default

5. Guest upload page
- This is the most important mobile-first screen
- Make it extremely easy and warm
- Guest only needs to:
  - understand they are in the correct wedding
  - type their name
  - upload up to 10 photos
  - tap one clear button
- Remove any technical, admin, or traceability details from this screen
- Make it feel emotional and effortless
- Add a soft thank-you moment after upload

Overall feeling:
- intimate
- romantic
- premium
- calm
- elegant
- human
- like a luxury wedding editorial, never like a startup admin template
```

## Refinement Prompt: Landing Page

```text
Refine the landing page only.

Make it feel more like a luxury wedding editorial and less like a software homepage.

Changes:
- reduce the amount of explanatory product text
- keep only one emotional headline, one elegant supporting paragraph, and two CTAs
- make the hero more spacious and centered
- use more whitespace
- add a subtle romantic editorial image treatment or soft photographic background
- make the CTA “Me voy a casar” feel premium and calm
- the secondary CTA “Ya tengo cuenta” should be understated
- remove anything that feels too feature-list-heavy or tech-product-like

Use Spanish copy.
Tone should feel intimate, refined, and emotional.
```

## Refinement Prompt: Auth Page

```text
Refine the authentication page only.

Make it feel like a private invitation, not a standard app login.

Changes:
- simplify the layout
- reduce visual weight
- use a more centered and elegant composition
- make the tab switch between sign in and create account feel refined and minimal
- remove any unnecessary helper text
- inputs should feel premium and calm
- primary button should look soft, luxurious, and confident
- use Spanish copy

Avoid any “SaaS dashboard” feeling.
```

## Refinement Prompt: Dashboard

```text
Refine the dashboard only.

This screen should feel like a private wedding studio, not an analytics dashboard.

Changes:
- reduce hard metrics and visual noise
- keep event creation as the main focal point
- make event cards more editorial and less boxy
- emphasize event title and date
- use softer hierarchy and more breathing room
- avoid technical labels and avoid dense admin language
- the page should feel calm, premium, and easy to scan on mobile

Use Spanish copy.
```

## Refinement Prompt: Event Workspace

```text
Refine the event workspace only.

This screen manages tables and QR codes for one wedding event.

Changes:
- make the event header more elegant and less operational
- reduce or hide raw system details like slug and token text
- show each table as a beautiful card with:
  - table number
  - optional family/group name
  - QR preview
  - clean actions
- make QR actions feel polished and simple
- prioritize clarity for iPhone users
- use more whitespace and gentler visual hierarchy
- keep the interface premium and emotionally aligned with the wedding theme

Use Spanish copy.
```

## Refinement Prompt: Guest Upload Page

```text
Refine the guest upload page only.

This page should feel incredibly easy, warm, and emotional.
It is opened from a printed QR code on a wedding table, mostly from mobile phones.

Changes:
- remove technical information and any admin-like content
- do not show internal identifiers, system status, traceability details, or implementation clues
- make the page focus only on:
  - wedding context
  - guest name
  - photo selection
  - one clear upload action
- use a warm romantic tone
- make the upload area simple and elegant
- add a soft thank-you confirmation state after upload
- optimize everything for a narrow mobile screen
- large tap targets, simple spacing, no clutter

Use Spanish copy.
This screen should feel effortless, intimate, and premium.
```

## Negative Guidance

```text
Avoid:
- startup SaaS visuals
- enterprise dashboard styling
- overly colorful accents
- purple or bright blue interfaces
- crowded cards
- too much explanatory text
- developer-facing details
- raw tokens or slugs visible in the main UI
- analytics-heavy presentation
- playful or cartoonish styling
```

## Suggested Copy Direction

If Stitch needs more product copy direction, use this tone:

- short
- romantic
- warm
- elegant
- reassuring
- never technical

Examples:

- “Los recuerdos más bonitos viven en los pequeños momentos.”
- “Tus invitados solo escanean, suben sus fotos y listo.”
- “Todo queda guardado de forma privada para ustedes.”
- “Crea su día, organiza sus mesas, comparte sus recuerdos.”
