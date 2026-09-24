# Bootsing

A personal calendar of cultural events: the things you find, save and actually
go to. It shows one week at a time as a spreadsheet-style grid, lets you triage
saved events (Boots / Maybe / Interesting), and has two Claude-powered helpers:
a chat box that proposes edits you approve one by one, and a "research this
week" action that searches the web for events matching your written
preferences.

It was built for one person's Barcelona, but everything that makes it personal
lives in the database and a few small files, so you can point it at your own
city and tastes (see [Personalising](#personalising)).

Built with Next.js 16 (App Router), React 19, TypeScript, Supabase (Postgres)
and the Anthropic SDK.

## Requirements

- Node 20.6 or newer (see `.nvmrc`).
- A [Supabase](https://supabase.com) project (the free tier is fine).
- An [Anthropic API key](https://console.anthropic.com/settings/keys). Usage is
  billed to your own console account, separately from any claude.ai
  subscription.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the database schema. With the
   [Supabase CLI](https://supabase.com/docs/guides/cli) installed:

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

   This applies the SQL files in `supabase/migrations/`. Without the CLI,
   paste them into the project's SQL editor in order.

3. Configure the environment:

   ```bash
   cp .env.example .env.local
   ```

   Fill in `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   (Project Settings → API) and `DEFAULT_USER_ID` (any UUID; the app is
   single-user and scopes every row to it). `ANTHROPIC_MODEL` is optional.
   Set `SEED_USERNAME`, `SEED_PASSWORD` (and optionally `SEED_EMAIL`) for the
   login you'll create in step 5.

4. Seed a starter dataset (categories, week boundaries, preferences and a set
   of example events). Re-running it resets that user's rows:

   ```bash
   npm run seed
   ```

5. Create your login user from the `SEED_*` values in `.env.local`. Re-running
   overwrites the username, email and password:

   ```bash
   npm run seed:user
   ```

6. Run it:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000. Home shows saved events (none yet); Explore
   shows everything. Try the chat box with "delete the jazz night at Marula",
   or navigate to a week with no events and click "Research events for this
   week".

## Scripts

| Command             | What it does                                                |
| ------------------- | ----------------------------------------------------------- |
| `npm run dev`       | Dev server with hot reload                                  |
| `npm run build`     | Production build (also type-checks the routes)              |
| `npm start`         | Serve a production build                                    |
| `npm run check`     | Lint, typecheck, format check and unit tests (what CI runs) |
| `npm run lint`      | ESLint                                                      |
| `npm run typecheck` | `next typegen` + `tsc --noEmit`                             |
| `npm test`          | Unit tests (Vitest); `npm run test:watch` to watch          |
| `npm run format`    | Prettier; `npm run format:check` to verify                  |
| `npm run seed`      | Reset and seed the database from `supabase/seed/`           |

## How it works

[docs/architecture.md](docs/architecture.md) has the module map and request
flows. In short:

- Pages are Server Components that read from Supabase on every request and
  hand the data to a client component.
- Every change goes through a small set of API routes that validate their
  input with zod schemas in `src/lib/validation.ts`. The same schemas generate
  the tool definitions Claude receives, so the model can only propose events
  the API would accept.
- The chat never writes directly: its add/edit/delete calls come back as a
  proposal you approve, and only approved actions are applied.
- Research deletes the week's events and inserts what Claude found, so it is
  confirmed first when the week isn't empty.

## Personalising

- **What to look for.** The Configuration page edits the preference sections
  the research prompt is built from: event types, favourite venues, what to
  skip. This is where most of the "personal" lives.
- **Categories, groups and colours.** Seeded from `supabase/seed/meta.json`
  into the `categories` and `app_settings` tables. The category and genre keys
  are also TypeScript unions in `src/lib/types.ts` (`CATEGORY_KEYS`,
  `GENRE_KEYS`), so changing the vocabulary means updating both.
- **Status labels and emoji** for saved events: `src/lib/status-meta.ts`.
- **Prompts.** `src/lib/system-prompt.ts` (chat) and
  `src/lib/research-prompt.ts` (research). The city is currently hardcoded
  there and in the empty-week copy in `CalendarApp`.
- **Model.** Set `ANTHROPIC_MODEL` in `.env.local` to try another Claude
  model.
- **Theme.** Every colour is a token in `src/styles/theme.css`.

## Deploying

Any host that runs a Node server works (Vercel, Render, Railway, Fly.io, a
VPS). Set the four environment variables in the host's dashboard rather than
committing `.env.local`. The research route declares `maxDuration = 120`
seconds; check your host allows that for serverless functions.

**There is no authentication.** Anyone who can reach the deployment can edit
your calendar and spend your Anthropic credits through the chat and research
endpoints. Keep it private (a VPN, an access-protected host, or a shared-secret
middleware) until auth is added.

## Cost

Chat turns cost fractions of a cent in tokens plus a flat fee per web search
Claude runs (capped at 3 per chat turn and 5 per research run). A research run
is the most expensive action, typically a few cents. At personal usage this
comes to well under a few dollars a month; check current pricing at
https://www.anthropic.com/pricing.

## Development

`npm run check` must pass before merging; the GitHub Actions workflow runs it
plus a production build on every push and pull request. Formatting is
Prettier's job (`npm run format`), and ESLint stays out of style. Pure logic
lives in `src/lib` and is unit-tested; components stay thin.

## License

MIT, see [LICENSE](LICENSE).
