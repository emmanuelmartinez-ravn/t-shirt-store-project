# Code Style

## Formatting

- Prettier is the source of truth (`.prettierrc`): single quotes, trailing commas everywhere (`all`). Don't hand-format against it — run `pnpm format` / let the pre-commit hook's `pnpm lint --fix` apply it.
- ESLint (`eslint.config.mjs`) runs `typescript-eslint`'s `recommendedTypeChecked` rules. Notable overrides:
  - `no-explicit-any` is **off** — `any` is allowed where it's genuinely the right escape hatch, but don't reach for it as a substitute for a real type.
  - `no-floating-promises` and `no-unsafe-argument` are `warn`, not `error` — don't ignore the warnings just because they don't fail the build.
  - `*.spec.ts` files get `eslint-plugin-jest`'s recommended rules, with `@typescript-eslint/unbound-method` off in favor of `jest/unbound-method` (it understands `jest.fn()`/mocked methods correctly, the base rule doesn't).
- Never disable a lint rule inline (`// eslint-disable-next-line`) to make a change pass — fix the underlying issue, or ask if the rule genuinely doesn't apply.

## TypeScript

- `strictNullChecks` is on; `noImplicitAny` is **off**. Be deliberate about `null`/`undefined` handling even though implicit `any` won't be flagged.
- Decorators are enabled (`experimentalDecorators`, `emitDecoratorMetadata`) — required for NestJS DI, `class-validator`, and Prisma.
- Module system is `nodenext` — relative imports must resolve the way Node's ESM/CJS interop expects; don't add `.js` extensions to `.ts` imports (the `moduleNameMapper` in `package.json`'s jest config strips them for tests, but source files should just import without extensions, matching every existing file).

## Naming & shape

- Classes: `PascalCase`, matching the file name in `kebab-case` (`roles.controller.ts` → `RolesController`, `role-already-exists.ts` → `RoleAlreadyExistsError`).
- The abstract repository class per domain (the dependency-inversion port, e.g. `RoleRepository`) is named `<Entity>Repository` — not `I<Entity>...` or `<Entity>Interface`. NestJS DI needs a real class (not a TS `interface`) to use as an injection token, hence `abstract class`, not `interface`. There's no separate "use-case port" abstraction: a use-case (e.g. `CreateRoleUseCase`) is a concrete class the controller depends on directly.
- Use-cases: one concrete class per operation, named `<Verb><Entity>UseCase` (`CreateRoleUseCase`, `DeleteRoleUseCase`), each with a single `execute()` method.
- DTOs end in `Dto` (`CreateRoleDto`, `RoleResponseDto`). Domain errors end in `Error` and set `this.name` in the constructor to their own class name.
- Domain models expose `static create(props)` for constructing a brand-new entity (generates `id`, timestamps) and `static restore(props)` for rehydrating one from persistence (all fields passed in) — never a public constructor called directly from outside the model, and never a bare object literal standing in for the entity.
- One class per file; file path mirrors the class's role in the Onion layering (see CLAUDE.md's Architecture section).

## Imports

- Relative imports only within `src/` — no path aliases are configured. Import depth naturally reflects how many Onion layers you're crossing (each layer subfolder adds a `../`); if an import path looks absurdly deep (`../../../../generated/prisma/client`), that's a signal you're in the right place (an `infrastructure/` repository, the only layer allowed to know about Prisma) rather than a code smell to "fix" with an alias.
- Group by origin isn't enforced by tooling here — follow the existing per-file ordering (external packages, then relative imports, roughly nearest-dependency-last) rather than inventing a new grouping scheme.

## Nest-specific conventions

- Every injectable class that logs uses Nest's built-in `Logger`, instantiated as `private readonly logger: Logger = new Logger(ClassName.name)` — not `console.log`, not a third-party logging library.
- Exception mapping (`AllExceptionsFilter`, `PrismaExceptionFilter`) is registered once, globally, in `main.ts` via `app.useGlobalFilters(...)` — not a `@Global()` Nest module. `PrismaService` lives in `PrismaModule` (not `@Global()`) and is imported explicitly by every domain module that needs it.
- Swagger decorators (`@ApiProperty`, `@ApiOperation`, `@ApiOkResponse`, etc.) are expected on every public DTO and controller endpoint — undocumented endpoints are the exception, not the norm, given `/docs` is the project's live API reference.

## What not to do

- Don't introduce a new state-management, DI, or HTTP framework pattern outside what NestJS already provides.
- Don't add a new lint/format tool or config layer (e.g. a separate `.eslintrc`, a Biome config) alongside the existing flat config.
- Don't hand-roll validation logic in a controller or service — `class-validator` decorators on the DTO are the only validation layer; the global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) assumes that.
