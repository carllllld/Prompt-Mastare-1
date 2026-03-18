# Project Structure

## Directory Organization

```
/
├── client/              # Frontend React application
├── server/              # Backend Express application
├── shared/              # Shared TypeScript types and Zod schemas
├── script/              # Build and utility scripts
├── docs/                # Documentation files
└── attached_assets/     # User-uploaded assets and screenshots
```

## Client Structure

```
client/
├── src/
│   ├── components/      # React components
│   │   ├── ui/         # Radix UI primitives (shadcn/ui style)
│   │   └── *.tsx       # Feature components
│   ├── pages/          # Route page components
│   ├── hooks/          # Custom React hooks
│   │   ├── use-auth.ts
│   │   ├── use-optimize.ts
│   │   ├── use-stripe.ts
│   │   └── use-teams.ts
│   ├── lib/            # Client utilities
│   │   ├── auth-utils.ts
│   │   ├── error-handler.ts
│   │   ├── retry.ts
│   │   └── utils.ts
│   ├── App.tsx         # Root component
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
├── public/             # Static assets
└── index.html          # HTML template
```

## Server Structure

```
server/
├── lib/                # Modular business logic (38 files)
│   ├── listing-*.ts   # AI pipeline modules
│   ├── text-*.ts      # Text validation and rules
│   ├── email-*.ts     # Email service modules
│   └── *.ts           # Other utilities
├── routes.ts           # API routes (monolithic, 6795 lines)
├── index.ts            # Server entry point
├── db.ts               # Database configuration
├── auth.ts             # Authentication middleware
├── storage.ts          # File storage
└── tests/              # Test files
```

## Key Patterns

### Modular Library Design

The `server/lib/` directory contains 38 specialized modules that handle specific concerns:
- Pipeline orchestration (listing-orchestrator.ts)
- Decision engines (listing-decision-engine.ts)
- Quality gates (listing-quality-guards.ts)
- Text validation (text-validation.ts, text-rules.ts)
- Observability (listing-pipeline-observability.ts)

### Monolithic Routes

`server/routes.ts` is intentionally monolithic (6795 lines) and should eventually be refactored into smaller route modules.

### Shared Schema

The `shared/` directory contains Zod schemas used by both client and server for type-safe validation.
