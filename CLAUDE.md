# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A NestJS + Prisma backend API for a t-shirt store (`T-Shirt Store API`, Swagger docs served at `/docs`). Uses PostgreSQL via `@prisma/adapter-pg`.

## Commands

Package manager is **pnpm**.

```bash
pnpm start:dev        # run with hot reload
pnpm build             # nest build
pnpm lint              # eslint --fix on src/apps/libs/test
pnpm format             # prettier --write on src/test

pnpm test               # unit tests (jest)
pnpm test:watch         # jest --watch
pnpm test:cov           # coverage
pnpm test:e2e           # e2e tests (test/jest-e2e.json)
pnpm test:debug         # jest --runInBand with node inspector

# run a single test file
pnpm test -- create-role.use-case.spec.ts
# run tests matching a name
pnpm test -- -t "createRole"
```

Local Postgres for development: `docker compose -f docker/docker-compose.yaml up -d` (db `tshirt_store`, port 5432).

Prisma (schema at `prisma/schema.prisma`, client generated to `generated/prisma`, config in `prisma.config.ts`):
```bash
pnpm prisma migrate dev      # create/apply a migration locally
pnpm prisma generate         # regenerate the client after schema changes
```
The `prisma-cli` and `prisma-client-api` skills are available for detailed Prisma command/query reference.

A husky `pre-commit` hook runs `pnpm lint` and `pnpm test` — keep both green before committing.

## Agent workflow notes

- If you start `pnpm start:dev` (or any process that binds port 3000) to verify a change, kill it — and any leftover process still holding port 3000 — once you're done checking, instead of leaving it running in the background.
- Don't read files under `generated/` (e.g. `generated/prisma/models/*.ts`, `generated/prisma/client.ts`) — they're auto-generated and can run to thousands of lines, burning context for little value. Look up the actual field names/types from `prisma/schema.prisma` instead; only read a `generated/` file if you specifically need to confirm an exported type name Prisma produces (e.g. `RoleModel`), and prefer `Grep` over `Read` even then.

## Additional references

This file is the canonical, always-loaded overview. Deeper reference docs live under `.claude/` and stay in sync with it — check them before assuming a gap in this file means "no convention exists":

- `.claude/project/architecture.md` — stack details, pre-commit/PR verification checklist, and a "Don'ts" list.
- `.claude/rules/code-style.md` — formatting/lint specifics, naming conventions, Nest-specific patterns.
- `.claude/rules/testing.md` — exactly how each layer is unit-tested (use-cases, controllers, repositories, filters), with the conventions every existing spec follows.
- `.claude/commands/commit.md` (`/commit`) and `.claude/commands/pr.md` (`/pr`) — this repo's commit/PR workflow; prefer these over ad hoc git commands.
- `prisma-cli` / `prisma-client-api` skills — detailed Prisma command/query reference (see Commands above).

## Architecture

Each business domain is its own top-level module under `src/<domain>/`, following an **Onion/Clean Architecture** layering: Presentation → Application → Domain, with Infrastructure implementing an abstraction the Application layer depends on (Dependency Inversion) instead of a concrete class. Folder layout is **nested by layer** — each domain has a `domain/`, `application/`, `infrastructure/`, and `presentation/` subfolder, with the existing type-based folders (`models/`, `errors/`, `use-cases/`, `repositories/`, `mappers/`, `controllers/`, `dto/`) nested one level inside the layer they belong to:

```
src/<domain>/
  domain/
    models/              # plain classes, no framework deps — static create() (new entity) /
                         #   static restore() (rehydrate from persistence)
    errors/               # domain-specific Error subclasses (e.g. RoleAlreadyExistsError)
  application/
    use-cases/            # one class per operation (e.g. CreateRoleUseCase), single execute() method;
                          #   depends only on the domain repository abstraction, never the concrete class
  infrastructure/
    repositories/         # abstract *.repository.ts port (e.g. RoleRepository) +
                          #   concrete Prisma-backed adapter (e.g. PrismaRoleRepository extends it)
    mappers/              # persistence mapper: Prisma record <-> domain model (e.g. RolesPersistenceMapper)
  presentation/
    controllers/          # NestJS REST controllers; inject use-case classes directly
    dto/                  # class-validator/class-transformer request DTOs + swagger response DTOs
    mappers/              # response mapper: domain model <-> response DTO (e.g. RolesResponseMapper)
  <domain>.module.ts       # composition root — not nested in any layer folder; wires everything together
```

Key conventions:
- `<domain>.module.ts` stays at the domain root (not inside any layer folder) since it's the Nest wiring/composition point that ties all four layers together.
- Controllers depend on use-case classes; use-cases depend on a repository **abstraction** (an abstract class per domain, e.g. `RoleRepository`) rather than the concrete Prisma-backed class. The dependency is inverted via a Nest custom provider bound inline in `<domain>.module.ts` — e.g. `{ provide: RoleRepository, useClass: PrismaRoleRepository }` — no separate DI-wiring config layer; the binding lives directly in the module.
- An abstract class (not a TS `interface`) is used for the port because interfaces vanish at runtime and Nest DI needs a real token to bind against — an abstract class supplies both the token and the type in one declaration.
- Domain models are framework-free. Mapping is split by direction across the layer boundary it belongs to: `infrastructure/mappers/*.mapper.ts` maps Prisma records to/from domain models (used by repositories), and `presentation/mappers/*.mapper.ts` maps domain models to/from response DTOs (used by controllers) — these are two separate classes, not one shared mapper, since each side is used by a different layer.
- Use-cases catch domain-level errors (e.g. `RoleAlreadyExistsError`) and throw the appropriate Nest `HttpException` subclass directly (`ConflictException`, `BadRequestException`, `InternalServerErrorException`, etc.) with a `{ error, details }` payload — no exception-abstraction layer. This is a deliberate, pragmatic trade-off against strict Clean Architecture purity: `HttpException` is a lightweight data-wrapper, not a framework lifecycle dependency, so throwing it from a use-case doesn't meaningfully couple the Application layer to Nest.
- `src/prisma` provides `PrismaService`, a `PrismaClient` wired with the `pg` driver adapter and connected/disconnected via Nest lifecycle hooks; feature modules import `PrismaModule` explicitly.
- Two exception filters are registered globally in `main.ts`: `PrismaExceptionFilter` (maps known Prisma error codes — P2002 unique constraint, P2025 not found, P2003 FK violation — to HTTP errors) and `AllExceptionsFilter` (catch-all, formats every error response as `{ error, details }` via `ErrorResponseDto`).
- `main.ts` also applies `helmet()` and a global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, and `transform` enabled — DTOs must declare every accepted field explicitly.
- New domains follow the `roles` module as the reference implementation (domain model/error, application use-case, infrastructure abstract + concrete repository + persistence mapper, presentation controller/dto/response mapper, module — each with a co-located `.spec.ts`).

Prisma schema notes: all models use UUID string ids, soft-delete via nullable `deletedAt`, and snake_case DB columns via `@map`/`@@map`-style field mapping while Prisma/TS field names stay camelCase.
