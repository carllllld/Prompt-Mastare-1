# Technology Stack

## Architecture

Full-stack TypeScript monorepo with client-server architecture deployed on Render with auto-deploy on git push.

## Backend

- **Runtime:** Node.js with Express
- **Language:** TypeScript (ES2020, ESNext modules)
- **Database:** PostgreSQL with Drizzle ORM
- **Cache:** Redis
- **AI:** OpenAI GPT-5.2 (reasoning: medium for main text, low for auxiliary fields)
- **Payments:** Stripe
- **Email:** Resend
- **Sessions:** express-session with connect-pg-simple
- **Monitoring:** Sentry
- **Security:** Helmet, CORS, rate limiting (express-rate-limit)

## Frontend

- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite 7
- **Routing:** Wouter
- **State Management:** TanStack Query (React Query)
- **UI Components:** Radix UI primitives
- **Styling:** Tailwind CSS with custom design tokens
- **Forms:** React Hook Form with Zod validation
- **Real-time:** WebSocket (ws)

## Key Libraries

- **Validation:** Zod schemas (shared between client/server)
- **Date handling:** date-fns
- **Retry logic:** p-retry, p-limit
- **Icons:** Lucide React
- **Animation:** Framer Motion
- **PDF:** Custom PDF export component

## Common Commands

```bash
# Development
npm run dev              # Start dev server (backend + frontend)

# Building
npm run build            # Build for production
npm run check            # TypeScript type checking

# Database
npm run db:push          # Push schema changes to database

# Testing
npm run test             # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:regression  # Run regression tests
npm run test:canary      # Run canary quality tests

# Utilities
npm run launch:gate      # Run launch gate checks
npm run quota:refill     # Refill user quotas
```

## Project Structure

```
/
├── client/              # Frontend React app
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Client utilities
│   └── public/          # Static assets
├── server/              # Backend Express app
│   ├── lib/             # Modular business logic (38 files)
│   ├── routes.ts        # API routes (monolithic, 6795 lines)
│   ├── index.ts         # Server entry point
│   └── db.ts            # Database configuration
├── shared/              # Shared types and schemas
└── script/              # Build and utility scripts
```

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` or `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key
- `SESSION_SECRET` - Session encryption key
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `RESEND_API_KEY` - Email service API key

Optional:
- `REDIS_URL` - Redis connection string (for caching)
- `SENTRY_DSN` - Error monitoring
- `NODE_ENV` - Environment (development/production)
