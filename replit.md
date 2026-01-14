# OptiPrompt Mäklare

## Overview

OptiPrompt Mäklare is an AI-powered SaaS application for Swedish real estate agents (mäklare) to generate professional property descriptions (objektbeskrivningar). The system uses sophisticated AI prompts with deep knowledge of Swedish architecture (1880-2026), geographic intelligence (Stockholm/Göteborg/Malmö), market trends 2025-2026, and buyer psychology to create selling descriptions optimized for Hemnet and social media.

## AI Knowledge Base Features (Updated January 2025)

### Architectural Library
- **Epochs covered**: 1880-1920 (Sekelskifte/Jugend), 1920-1940 (Klassicism), 1930-1950 (Funktionalism), 1950-1960 (Folkhemmet), 1960-1970 (Miljonprogrammet), 1970-1990 (Postmodernism), 2000-2010 (Millennieskiftet), 2015-2026 (Nyproduktion)
- **Material palettes and sales angles** for each epoch

### Geographic Intelligence
- **Stockholm**: Innerstan, Söderort, Västerort, Nacka/Värmdö, Solna/Sundbyberg, Täby/Danderyd
- **Göteborg**: Centrum, Örgryte/Härlanda, Hisingen, Askim/Hovås
- **Malmö**: Centrum, Västra Hamnen, Limhamn/Bunkeflo

### Market Trends 2025-2026
- Ränteklimat & köpbeteende
- Energiklass & driftskostnader (kritiskt säljargument)
- Hållbarhet & miljö
- Hybridarbete & hemmakontor
- Balkong & uteplats värdering
- Föreningsekonomi

### Buyer Psychology Segments
- Förstagångsköpare (25-35)
- Unga familjer (30-40)
- Etablerade familjer (40-55)
- Downsizers (55+)
- Investerare

### BRF/Förening Analysis
- Skuldfri förening, stambytt, avgift, markägande
- Gemensamma utrymmen och faciliteter
- Varningsflaggor och proaktiv hantering

### Hemnet-Optimized Output
- **Top 5 Highlights**: Bullet points först (✓ format)
- **Öppningsmallar**: Standard, Premium (4M+), Exklusivt (8M+), Charm-fokus
- **Anti-klysch-filter**: 20+ förbjudna ord med ersättningsstrategier
- **Premium adjektiv**: Tidlös, sofistikerad, raffinerad (max 2-3 per text)

### Mäklarstil-inspiration
- **Erik Olsson-stilen**: Varmt välkomnande, sekelskiftescharm + modern funktion
- **Fastighetsbyrån-stilen**: Stolt presentation, tidlösa element, emotionell livsstilsförsäljning

### 6-Step AI Work Process
1. Dekonstruktion & Analys
2. Highlights (Top 5)
3. Öppningsmall
4. Sensoriskt Storytelling
5. Anti-klysch-verifiering
6. Slutförädling

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
- **Basic plan**: 20 optimizations per day, 1000 characters per prompt ($3.99/month)
- **Pro plan**: 50 optimizations per day, 2000 characters per prompt ($6.99/month)
- Limits reset automatically at midnight (user's local timezone)

## Stripe Integration (Configured)
- **Products**: OptiPrompt Basic, OptiPrompt Pro
- **Prices**: Basic $3.99/month, Pro $6.99/month
- **Checkout endpoint**: `POST /api/stripe/create-checkout` (accepts `tier` in body: "basic" or "pro")
- **Webhook endpoint**: `POST /api/stripe/webhook`
- **Configured secrets**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_BASIC_PRICE_ID`, `STRIPE_PRO_PRICE_ID`
- **Webhook events handled**:
  - `checkout.session.completed` - Upgrades user to Basic or Pro based on targetPlan metadata
  - `customer.subscription.deleted` - Downgrades user to Free
  - `invoice.payment_failed` - Downgrades user to Free

## Session Storage
- Sessions are stored in PostgreSQL using `connect-pg-simple`
- Table: `user_sessions` (auto-created)
- Sessions persist across server restarts