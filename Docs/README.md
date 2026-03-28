# Docs

Technical documentation for the WedSnap repository.

## Available Guides

- [Getting Started](Getting_Started.md)
- [Architecture Overview](Architecture.md)
- [Database Docs](Db/README.md)

## Database File Convention

- Database-related SQL files now live in `Docs/Db/`.
- `Db/Migration_Script.sql` is the executable SQL file we update whenever we need to change the database in Supabase.
- `Db/Database_schema.sql` is a reference snapshot exported from Supabase to reflect the current live structure.
- We can fully replace the contents of `Db/Migration_Script.sql` when needed because Git history preserves previous versions.

## Suggested Reading Order

1. Read [Getting Started](Getting_Started.md) to initialize the React app and local environment.
2. Review [Architecture Overview](Architecture.md) to understand the guest flow, admin flow, and security model.
3. Open [Database Docs](Db/README.md) for the database workflow and SQL files.
4. Run [Migration_Script.sql](Db/Migration_Script.sql) in Supabase SQL Editor when applying database changes.
5. Use [Database_schema.sql](Db/Database_schema.sql) as a read-only reference of the current database state.
6. Use [Supabase_seed_template.sql](Db/Supabase_seed_template.sql) to create the event, assign the first admin, and generate table QR codes.
