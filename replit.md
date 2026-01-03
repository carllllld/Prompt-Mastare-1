# OptiPrompt

## Overview

OptiPrompt is an AI-powered prompt optimization tool with multilingual prompt support. Users submit prompts in any language along with a category (General, Business, Programming, etc.), and the application uses OpenAI's GPT-4o-mini to improve the prompt, explain what was changed, and provide additional suggestions. The goal is to help users get better, more precise responses from AI models like ChatGPT.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack Query for server state, React hooks for local state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style variant)
- **Animations**: Framer Motion for smooth transitions
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: Single endpoint REST API (`POST /api/optimize`)
- **Validation**: Zod schemas shared between frontend and backend
- **AI Integration**: OpenAI SDK (GPT-4o model with JSON response format)

### Data Layer
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Schema Location**: `shared/schema.ts` contains all database tables and Zod validation schemas
- **Migrations**: Managed via `drizzle-kit push`

### Shared Code Pattern
The `shared/` directory contains code used by both frontend and backend:
- `schema.ts`: Database schemas, Zod validation, and TypeScript types
- `routes.ts`: API route definitions with input/output schemas
- `models/chat.ts`: Additional conversation/message models (for chat integration features)

### Replit Integrations
Pre-built integration modules in `server/replit_integrations/`:
- **batch**: Rate-limited batch processing utilities for LLM calls
- **chat**: Conversation management with OpenAI streaming
- **image**: Image generation using gpt-image-1 model

### Build Process
- Development: `tsx` for hot-reloading TypeScript server
- Production: Custom build script using esbuild (server) and Vite (client)
- Output: Bundled to `dist/` directory

## External Dependencies

### AI Services
- **OpenAI API**: Primary AI provider for prompt optimization (GPT-4o model)
- Environment variables: `OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`

### Database
- **PostgreSQL**: Required for data persistence
- Environment variable: `DATABASE_URL`
- Connection: pg Pool with Drizzle ORM

### Key NPM Packages
- `openai`: Official OpenAI SDK
- `drizzle-orm` + `drizzle-zod`: Database ORM with Zod schema generation
- `@tanstack/react-query`: Data fetching and caching
- `framer-motion`: Animation library
- `shadcn/ui` components: Built on Radix UI primitives
- `wouter`: Lightweight React router
- `zod`: Runtime type validation
- `express-session` + `memorystore`: Session management

## Usage Limits
- **Free plan**: 2 optimizations per day, 500 characters per prompt
- **Pro plan**: 50 optimizations per day, 2000 characters per prompt (69 kr/month)
- Limits reset automatically at midnight

## Stripe Integration (Configured)
- **Product**: OptiPrompt Pro
- **Price**: 69 kr/month
- **Checkout endpoint**: `POST /api/stripe/create-checkout`
- **Webhook endpoint**: `POST /api/stripe/webhook`
- **Configured secrets**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`
- **Webhook events handled**:
  - `checkout.session.completed` - Upgrades user to Pro
  - `customer.subscription.deleted` - Downgrades user to Free
  - `invoice.payment_failed` - Logs payment failure

## Session Storage
- Sessions are stored in PostgreSQL using `connect-pg-simple`
- Table: `user_sessions` (auto-created)
- Sessions persist across server restarts