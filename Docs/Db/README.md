# Database Docs

Database-related SQL files for WedSnap live in this folder.

## Files

- [Migration_Script.sql](Migration_Script.sql): executable SQL used to apply database changes in Supabase.
- [Database_schema.sql](Database_schema.sql): exported snapshot of the current live database, kept as reference.
- [Supabase_seed_template.sql](Supabase_seed_template.sql): template for creating the event, first admin, and table QR codes.

## Working Rule

Use `Migration_Script.sql` when making changes.

Use `Database_schema.sql` to inspect the current database shape after exporting it from Supabase.
