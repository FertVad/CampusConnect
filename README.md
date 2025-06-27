# CampusConnect Setup

This project can store all data in a single Supabase (PostgreSQL) database.
Follow the steps below to configure the connection and run the app locally.

## 1. Install dependencies

Run `npm install` to install all server and client packages.
When switching between macOS and Linux you must reinstall dependencies so that
the platform specific **esbuild** binary matches your system. Remove the
`node_modules` folder and run `npm ci` again whenever you move the project
between different operating systems.

## 2. Create a Supabase project

From the Supabase dashboard create a new project and obtain the **connection string**
for the Postgres database. It should look similar to:

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

While in the dashboard open **Settings → API** to find the project URL and API keys:

- **Project URL** – used as `SUPABASE_URL`
- **anon public** key – used as `SUPABASE_ANON_KEY`
- **service_role** key – used as `SUPABASE_SERVICE_ROLE_KEY`

## 3. Configure environment variables

Create a `.env` file in the project root (you can copy `.env.example`).
Provide the connection string, Supabase project URL and keys, and a session secret. You can also adjust caching and logging via the variables `CACHE_TTL` and `LOG_LEVEL`.

```
SUPABASE_DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
# Supabase project details
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=public-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=public-anon-key

SESSION_SECRET=your-session-secret
CACHE_TTL=60
LOG_LEVEL=info
```

The `DATABASE_URL` variable is also used by the migration tool. You can set it to
same value or leave it unset if you only use `SUPABASE_DATABASE_URL`.

## 4. Apply the database schema

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

## 5. Seed sample data (optional)

Run `npm run db:seed` to apply the migrations and insert demo records.

### Migrations

If you change `shared/schema.ts` later (for example to add indexes), generate a
SQL migration and apply it:

```
npx drizzle-kit generate --config=drizzle.config.ts
psql "$SUPABASE_DATABASE_URL" -f migrations/<generated_file>.sql
```

## 6. Start the development server

After the variables are set and the schema is applied you can start the client and server together or separately:

```
npm run dev

# or run them individually
npm run dev:server
npm run dev:client
```

The server will automatically use `SupabaseStorage` for all data access.

Note: The API is available at http://localhost:3001.

## Student capabilities

Students can create tasks for themselves, update the details or status of tasks
they own, and view tasks assigned to them. They cannot delete tasks or view
other users' information unless explicitly shared with them.
