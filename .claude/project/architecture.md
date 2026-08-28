# Architecture

This is supplementary detail. `CLAUDE.md` (repo root) is the canonical, auto-loaded reference for the domain folder layout (Presentation → Application → Domain ← Infrastructure) — read that first. This file covers the stack, verification steps, and conventions that aren't already there.

## Stack

- **Framework**: NestJS 11 (TypeScript, `experimentalDecorators` + `emitDecoratorMetadata`)
- **ORM**: Prisma 7, client generated to `generated/prisma` (gitignored), accessed via `@prisma/adapter-pg` driver adapter over `pg`
- **Database**: PostgreSQL 17 (local dev via `docker/docker-compose.yaml`, db `tshirt_store`, port 5432)
- **Validation**: `class-validator` / `class-transformer`, enforced globally via a `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`)
- **API docs**: `@nestjs/swagger`, served at `/docs`
- **Security**: `helmet()` applied globally in `main.ts`
- **Auth**: `bcrypt` for password hashing, `@nestjs/jwt` for access tokens, `@casl/ability` present as a dependency for future authorization rules (not yet wired into the auth flow)
- **Scheduling**: `@nestjs/schedule` (pinned to `6.1.3` — later majors ship ESM-only and break this CommonJS project's Jest/runtime)
- **Testing**: Jest + `ts-jest` for unit tests, a separate Jest config (`test/jest-e2e.json`) for e2e
- **Lint/format**: ESLint 9 flat config (`typescript-eslint` recommended + type-checked, `eslint-plugin-jest` on `*.spec.ts`) + Prettier
- **Package manager**: pnpm (see `pnpm-workspace.yaml` for the build-approval allowlist — native modules like `bcrypt` and Prisma engines need `allowBuilds`)
- **Git hooks**: husky `pre-commit` runs `pnpm lint && pnpm test` — every commit is gated on this

Two cross-cutting modules sit outside the per-domain folders (see CLAUDE.md's Architecture section for the full per-domain layout):

- **`src/exceptions/`** — `AllExceptionsFilter`, the catch-all global filter that normalizes every unhandled error response to `{ error, details }` via `ErrorResponseDto`. There is deliberately no exception-abstraction layer (no `ExceptionPort`-style indirection) — use-cases throw Nest `HttpException` subclasses directly, per the documented trade-off in CLAUDE.md.
- **`src/prisma/`** — `PrismaModule`, exports `PrismaService` (a `PrismaClient` wired with the `pg` driver adapter, connected/disconnected via `OnModuleInit`/`OnModuleDestroy`). Also owns `PrismaExceptionFilter`, which maps known Prisma error codes to HTTP errors (P2002 unique constraint → 409, P2025 not found → 404, P2003 FK violation → 400, else → 500).

Both filters are registered globally in `main.ts` (`PrismaExceptionFilter` before `AllExceptionsFilter`, so Prisma errors are handled first).

## Verification

Before treating any change as done:

1. **`pnpm lint`** — must be clean. The husky `pre-commit` hook enforces this on every commit already, but don't rely on the hook alone when scoping work across branches (see Don'ts).
2. **`pnpm test`** — all suites passing. Console `ERROR`/`WARN` lines from Nest's logger during negative-path tests are expected output, not failures — check the actual Jest summary (`Tests: N passed, N total`).
3. **`pnpm build`** — a clean `nest build` is the real signal that everything type-checks and wires together, especially after touching `app.module.ts`, module wiring, or cross-module imports. Lint alone doesn't catch every wiring issue.
4. For anything touching HTTP behavior, checking the Swagger doc at `/docs` after `pnpm start:dev` is the closest thing this repo has to a manual smoke test. Kill the process (and anything left on port 3000) once you're done — see CLAUDE.md's Agent workflow notes.

## Conventions

- **Commit style**: plain Conventional Commits, **no scopes** — `feat:`, `fix:`, `chore:`, `test:`, `docs:` (never `feat(roles):`). Match `git log` for tone/verb choice. `/commit` (`.claude/commands/commit.md`) encodes this — prefer it over ad hoc git commands.
- **No Claude attribution**: never add a `Co-Authored-By: Claude` trailer to commits, or Claude attribution text to PR bodies.
- **Dependency inversion boundary**: use-cases depend only on the domain's abstract repository class (e.g. `RoleRepository`), never on the concrete Prisma-backed adapter or on another domain's concrete classes. Wiring lives inline in `<domain>.module.ts` (`{ provide: RoleRepository, useClass: PrismaRoleRepository }`) — there's no separate DI-config file layer.
- **PR flow**: feature branches off `main`, PR via `gh pr create --base main`, Summary + Test plan body. `/pr` (`.claude/commands/pr.md`) encodes this. Pushing directly to `main` is intentionally gated behind a confirmation prompt (see `.claude/settings.local.json`) — treat that friction as intentional, not a bug to route around.
- **New domains**: copy the `roles` module's folder shape and layering exactly (see CLAUDE.md) — don't invent a new structure per domain.

## Don'ts

- **Don't commit code that depends on packages not yet committed.** `package.json`/`pnpm-lock.yaml` changes must land in the same branch (ideally the same or an earlier commit) as the code that needs them. A branch that only builds because your local `node_modules` happens to be in a stale state will fail CI/fresh-checkout.
- **Don't scope a branch/PR without checking what it actually needs to build standalone.** Before opening a PR, mentally (or actually) check out the branch fresh and ask whether `pnpm lint`/`pnpm build` would pass with *only* that branch's own commit history — not whatever happens to be sitting uncommitted in the working tree at the time.
- **Don't bypass the pre-commit hook** (`--no-verify`) to force a broken commit through. If lint/test fails, fix the cause or stop and ask.
- **Don't push directly to `main`**, and don't try to route around the confirmation prompt configured for it. Feature branch + PR, always.
- **Don't leave two open PRs with overlapping/superseding content silently.** If a new branch ends up containing everything an older open PR already has, say so explicitly and let the user decide whether to close/rebase.
- **Don't delete or "clean up" files outside the explicit scope of the current task without flagging it first** — even genuinely dead code should be called out before removal, not silently swept into an unrelated commit.
- **Don't throw framework-specific exceptions from anywhere except use-cases.** Domain/infrastructure layers throw plain domain `Error` subclasses (`RoleAlreadyExistsError`-style); only the use-case's catch block translates them into Nest `HttpException`s. This is the one place Nest-specific error handling is allowed outside the presentation layer, per CLAUDE.md's documented trade-off.
