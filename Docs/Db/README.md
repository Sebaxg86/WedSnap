# Database Docs

Database-related SQL files for WeddVue live in this folder.

## Files

- [Migration_Script.sql](Migration_Script.sql): executable SQL used to apply database changes in Supabase.
- [Database_schema.sql](Database_schema.sql): exported snapshot of the current live database, kept as reference.
- [Supabase_seed_template.sql](Supabase_seed_template.sql): optional template for manually creating an owner-linked event and table QR codes.

## Working Rule

Use `Migration_Script.sql` when making changes.

Use `Database_schema.sql` to inspect the current database shape after exporting it from Supabase.

Use `Supabase_seed_template.sql` only when you need a manual SQL seed. In the current product flow, owners can create events directly from the dashboard.
