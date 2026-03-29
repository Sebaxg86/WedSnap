# Docs

Technical documentation for the WeddVue repository.

## Available Guides

- [Getting Started](Getting_Started.md)
- [Architecture Overview](Architecture.md)
- [App Pipeline](App_Pipeline.md)
- [Module Map](Module_Map.md)
- [Database Docs](Db/README.md)

## Database File Convention

- Database-related SQL files now live in `Docs/Db/`.
- `Db/Migration_Script.sql` is the executable SQL file we update whenever we need to change the database in Supabase.
- `Db/Database_schema.sql` is a reference snapshot exported from Supabase to reflect the current live structure.
- We can fully replace the contents of `Db/Migration_Script.sql` when needed because Git history preserves previous versions.

## Suggested Reading Order

1. Read [Getting Started](Getting_Started.md) to initialize the React app and local environment.
2. Review [Architecture Overview](Architecture.md) to understand the public landing, owner flow, guest flow, and security model.
3. Read [App Pipeline](App_Pipeline.md) to understand the runtime flow from browser entry to page modules.
4. Use [Module Map](Module_Map.md) when you need to answer "If I want to modify X, where do I touch?".
5. Open [Database Docs](Db/README.md) for the database workflow and SQL files.
6. Run [Migration_Script.sql](Db/Migration_Script.sql) in Supabase SQL Editor when applying database changes.
7. Use [Database_schema.sql](Db/Database_schema.sql) as a read-only reference of the current database state.
8. Use [Supabase_seed_template.sql](Db/Supabase_seed_template.sql) only when you need a manual SQL seed for an owner-linked event and QR rows.
