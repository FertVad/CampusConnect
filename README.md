# CampusConnect Setup

This project can store all data in a single Supabase (PostgreSQL) database.
Follow the steps below to configure the connection.

## 1. Create a Supabase project

From the Supabase dashboard create a new project and obtain the **connection string**
for the Postgres database. It should look similar to:

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

## 2. Configure environment variables

Create a `.env` file in the project root (you can copy `.env.example`).
Provide the connection string and a session secret:

```
SUPABASE_DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
SESSION_SECRET=your-session-secret
```

The `DATABASE_URL` variable is also used by the migration tool. You can set it to
same value or leave it unset if you only use `SUPABASE_DATABASE_URL`.

## 3. Apply the database schema

Run the following command once to create all tables in Supabase:

```
npm run db:push
```

This command uses **Drizzle** to push the schema defined in `shared/schema.ts` to
Supabase. If you plan to store sessions in the database, also execute the SQL
script:

```
psql "$SUPABASE_DATABASE_URL" -f server/db/session-table.sql
```

## 4. Start the development server

After the variables are set and the schema is applied you can start the app:

```
npm run dev
```

The server will automatically use `SupabaseStorage` for all data access.
