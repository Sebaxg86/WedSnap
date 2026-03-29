# Module Map

Use this document to answer the practical question:

**If I want to modify X, where do I touch?**

## Core Rule

- `src/app/` controls app entry and routing.
- `src/features/` contains feature-specific UI and logic.
- `src/lib/` contains shared technical integrations.
- `src/shared/` contains reusable layout and generic utilities.
- `src/styles/` contains global styling tokens and shared CSS.
- `Docs/Db/` contains the database source-of-truth workflow.

## If I Want To Modify X

### Routes and navigation

- Add or change pages: [router.tsx](../src/app/router.tsx)
- Change the top navigation or shell layout: [AppShell.tsx](../src/shared/layouts/AppShell.tsx)

### Guest upload screen

- Change the main upload page: [GuestUploadPage.tsx](../src/features/guest-upload/pages/GuestUploadPage.tsx)
- Change the file-picker block: [UploadDropzone.tsx](../src/features/guest-upload/components/UploadDropzone.tsx)
- Change the selected-files list: [PhotoSelectionSummary.tsx](../src/features/guest-upload/components/PhotoSelectionSummary.tsx)
- Change the real Supabase upload orchestration, anonymous session handling, and RPC calls: [guestUploadService.ts](../src/features/guest-upload/lib/guestUploadService.ts)

### Upload rules and validation

- Change max photos per batch or form validation: [guestUploadSchema.ts](../src/features/guest-upload/lib/guestUploadSchema.ts)
- Change size formatting: [formatFileSize.ts](../src/shared/utils/formatFileSize.ts)

### Device traceability

- Change client-side device metadata capture: [getDeviceContext.ts](../src/lib/device/getDeviceContext.ts)
- Change what is stored in the database: [Migration_Script.sql](Db/Migration_Script.sql)

### Supabase connection

- Change environment variable parsing: [env.ts](../src/lib/config/env.ts)
- Change how the browser Supabase client is created: [client.ts](../src/lib/supabase/client.ts)
- Change the example environment variables: [.env.example](../.env.example)

### Admin area

- Change the admin page orchestration, session bootstrap, table filtering, or Supabase reads/writes: [AdminDashboardPage.tsx](../src/features/admin/pages/AdminDashboardPage.tsx)
- Change the admin sign-in form: [AdminLoginForm.tsx](../src/features/admin/components/AdminLoginForm.tsx)
- Change the event summary card and table-count creation flow: [EventSetupPanel.tsx](../src/features/admin/components/EventSetupPanel.tsx)
- Change each table card, QR actions, or mobile QR controls: [TableQrCard.tsx](../src/features/admin/components/TableQrCard.tsx)
- Change admin-side types: [adminTypes.ts](../src/features/admin/lib/adminTypes.ts)
- Change how frontend QR tokens are generated before saving: [generateQrToken.ts](../src/features/admin/lib/generateQrToken.ts)

### Table setup and QR generation

- Change how tables are represented in the database: [Migration_Script.sql](Db/Migration_Script.sql)
- Change how initial table rows are generated: [Supabase_seed_template.sql](Db/Supabase_seed_template.sql)
- Change the admin UX for configuring tables and generating QRs: [AdminDashboardPage.tsx](../src/features/admin/pages/AdminDashboardPage.tsx)

### Global look and feel

- Change colors, spacing, typography, layout primitives, buttons, cards, or responsive behavior: [globals.css](../src/styles/globals.css)
- Change document-level metadata like title or description: [index.html](../index.html)
- Change the favicon: [favicon.svg](../public/favicon.svg)

### App startup and rendering

- Change the React mount point: [main.tsx](../src/main.tsx)
- Change the top-level app handoff: [App.tsx](../src/app/App.tsx)

### Database

- Apply a new database change in Supabase: [Migration_Script.sql](Db/Migration_Script.sql)
- Check the current exported database shape: [Database_schema.sql](Db/Database_schema.sql)
- Seed the event, first admin, and QR codes: [Supabase_seed_template.sql](Db/Supabase_seed_template.sql)
- Understand the database workflow: [Docs/Db/README.md](Db/README.md)

### Tooling and project configuration

- Change npm scripts or dependencies: [package.json](../package.json)
- Change TypeScript path aliases or compiler rules: [tsconfig.app.json](../tsconfig.app.json)
- Change root TypeScript project references: [tsconfig.json](../tsconfig.json)
- Change Vite behavior or aliases: [vite.config.ts](../vite.config.ts)
- Change lint rules: [eslint.config.js](../eslint.config.js)

### Documentation

- Change the docs index: [Docs/README.md](README.md)
- Change setup instructions: [Getting_Started.md](Getting_Started.md)
- Change system-level explanation: [Architecture.md](Architecture.md)
- Change the runtime explanation: [App_Pipeline.md](App_Pipeline.md)

## Fast Mental Model

If the change is:

- visual: start in `src/styles/` or the feature component
- route-related: start in `src/app/router.tsx`
- feature-specific: start in `src/features/<feature>/`
- infrastructure-related: start in `src/lib/`
- cross-cutting UI: start in `src/shared/`
- database-related: start in `Docs/Db/`
