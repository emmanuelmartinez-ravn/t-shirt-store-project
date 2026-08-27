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
pnpm test -- roles.service.spec.ts
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

## Architecture

Each business domain is its own top-level module under `src/<domain>/` following **hexagonal (ports & adapters) architecture**, strictly layered:

```
src/<domain>/
  domain/
    models/            # plain classes, no framework deps — private constructor-style props,
                        #   static create() (new entity) / static restore() (rehydrate from persistence)
    errors/             # domain-specific Error subclasses (e.g. RoleAlreadyExistsError)
  application/
    ports/
      in/use-cases/     # abstract class defining the domain's public operations (e.g. RolesUseCase)
      out/repositories/ # abstract class defining what the domain needs from persistence (e.g. RolesPort)
    services/            # concrete use-case implementation; depends only on ports (in/out), never on infra
  infrastructure/
    adapters/
      in/controllers/    # NestJS REST controllers — depend on the use-case port, not the service directly
      in/dto/             # class-validator/class-transformer request DTOs + swagger response DTOs
      in/mappers/         # domain model <-> persistence/response mapping
      out/persistence/repositories/  # concrete port implementation (e.g. PrismaRoleAdapter implements RolesPort)
    config/               # `<Domain>Config` static class — builds NestJS Provider objects wiring
                          #   interface (port) tokens to concrete classes, used in the module's `providers`
  <domain>.module.ts
```

Key conventions:
- Controllers and services depend on **abstract classes** (ports), never on concrete adapters directly — DI wiring happens in `infrastructure/config/*.config.ts` via `useClass`/`useFactory`.
- Domain models are framework-free; persistence adapters map Prisma records to/from domain models via a dedicated `*.mapper.ts`.
- Services never throw HTTP errors directly — they call `ExceptionPort` (`src/exception`), which is a `@Global()` module wrapping Nest's `HttpException` subclasses (`badRequestError`, `conflictError`, `forbiddenError`, `internalServerError`, `notFoundError`, `unauthorizedError`). Domain-level errors (e.g. `RoleAlreadyExistsError`) are caught in the service and translated to the appropriate `ExceptionPort` call.
- `src/db` (`@Global()` `DbModule`) provides `PrismaService`, a `PrismaClient` wired with the `pg` driver adapter and connected/disconnected via Nest lifecycle hooks.
- Two exception filters are registered globally in `main.ts`: `PrismaExceptionFilter` (maps known Prisma error codes — P2002 unique constraint, P2025 not found, P2003 FK violation — to HTTP errors) and `AllExceptionsFilter` (catch-all, formats every error response as `{ error, details }` via `ErrorResponseDto`).
- `main.ts` also applies `helmet()` and a global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, and `transform` enabled — DTOs must declare every accepted field explicitly.
- New domains follow the `roles` module as the reference implementation (model, port, service, controller, Prisma adapter, mapper, config, module — each with a co-located `.spec.ts`).

Prisma schema notes: all models use UUID string ids, soft-delete via nullable `deletedAt`, and snake_case DB columns via `@map`/`@@map`-style field mapping while Prisma/TS field names stay camelCase.
