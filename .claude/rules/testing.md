# Testing

## Setup

- Unit tests: Jest + `ts-jest`, config lives inline in `package.json` (`rootDir: "src"`, `testRegex: ".*\\.spec\\.ts$"`). Every `*.spec.ts` under `src/` runs with `pnpm test`.
- E2e tests: separate config at `test/jest-e2e.json`, run with `pnpm test:e2e`. Only the default Nest boilerplate exists so far (`test/app.e2e-spec.ts`, hits `GET /`) — no domain-specific e2e suite has been written yet. Note: `test/jest-e2e.json` is currently missing the `moduleNameMapper` that strips `.js` extensions from the generated Prisma client's imports (the unit-test config in `package.json` has it) — `pnpm test:e2e` will fail with a `SyntaxError: Unexpected token 'export'` until that's added.
- The husky `pre-commit` hook runs `pnpm lint && pnpm test` on **every commit** — a spec file doesn't need to be staged for its failures to block a commit, since both commands run against the whole working tree.

## Test placement

- Every source file that has meaningful logic gets a co-located `<name>.spec.ts` next to it — not a mirrored `test/` tree. Look at any existing domain (`src/roles/`, `src/auth/`) for the pattern: `create-role.use-case.ts` + `create-role.use-case.spec.ts` sit in the same folder.
- What gets a spec: domain models with behavior, use-cases, controllers, repositories, and filters. What doesn't: pure wiring (`*.module.ts`) and DTOs — no DTO in this codebase has a dedicated spec, even ones with custom `class-validator`/`class-transformer` rules (e.g. `SignUpDto`'s password complexity rules) — their validation is exercised through the global `ValidationPipe` at the HTTP layer, not a unit spec.

## How each layer is tested

None of this project's specs use Nest's `Test.createTestingModule(...)` DI container — every spec constructs the class under test directly with `new`, passing hand-built mocks. This applies uniformly across use-cases, controllers, and repositories (the two exceptions are `app.controller.spec.ts` and `prisma.service.spec.ts`, both untouched Nest-CLI-generated boilerplate that predates this project's actual domains).

- **Use-cases** (`application/use-cases/*.spec.ts`): `new CreateRoleUseCase(roleRepository)`, where `roleRepository` is a plain object literal typed `jest.Mocked<RoleRepository>` with every abstract method stubbed via `jest.fn()` — including methods the test in question doesn't call, so the object satisfies the full abstract class shape. Never wire a real repository into a use-case test.
- **Controllers** (`presentation/controllers/**/*.spec.ts`): same direct-construction pattern, with each injected use-case mocked as `{ execute: jest.fn() } as unknown as jest.Mocked<XUseCase>`. Assert the controller passes the right arguments to the use-case and returns the mapped response — controllers have no logic of their own to test beyond that pass-through (plus, where present, response-status selection logic like `resend-activation`'s 200-vs-201 branch).
- **Repositories** (`infrastructure/repositories/*.spec.ts`): construct the concrete class directly (`new PrismaRoleRepository(prisma as unknown as PrismaService)`) with a hand-built `prisma` stub shaped as `{ role: { create: jest.fn(), findMany: jest.fn(), ... } }` — only the specific model methods the repository actually calls, not a full fake client.
- **Filters** (`*.filter.spec.ts`): construct the filter directly (`new AllExceptionsFilter()`), and hand-build a minimal `ArgumentsHost`/response double — `{ switchToHttp: () => ({ getResponse: () => ({ status: jest.fn().mockReturnValue({ json: jest.fn() }) }) }) } as unknown as ArgumentsHost`. Assert on what `status`/`json` were called with, not on a real HTTP response.

## Conventions

- `describe(ClassName)` at the top, nested `describe(methodName)` per method, `it('<lowercase behavior description>', ...)` — not `it('should ...')` except for the generic `it('is defined', ...)` smoke test that every use-case/controller/repository spec opens with.
- Test names describe **behavior and outcome**, not implementation: `'translates a unique constraint violation into RoleAlreadyExistsError'`, not `'calls prisma.role.create and catches error'`.
- Shared fixtures (e.g. a `role` built with `Role.restore({...})`) are declared once at the top of the `describe` block and reused across `it`s — don't rebuild the same fixture inline in every test.
- Async rejection assertions use `await expect(promise).rejects.toThrow(ErrorClass)` (or a message string), not a manual `try/catch`.
- Mock verification checks both the call (`toHaveBeenCalledWith(...)`) and the return value (`toBe`/`toEqual`) where both matter — don't assert only one when the test's purpose covers both.
- Negative-path tests that exercise the logger will print `[Nest] ... ERROR`/`WARN` lines during the run — that's expected output from the real `Logger`, not a sign the test is broken. Check the Jest summary (`Tests: N passed, N total`), not the console noise above it.

## What not to do

- Don't mock `PrismaService` with a full fake implementation — stub only the specific model methods (`role.create`, `role.findMany`, etc.) the repository under test actually calls.
- Don't reach for `jest.mock('module-path')` auto-mocking for this project's own classes — every existing spec uses explicit, hand-built mock objects passed straight into the constructor instead. Keep that consistent.
- Don't write a test that depends on a real database or the actual Prisma-generated client — every repository test stubs the client shape by hand.
- Don't skip writing a spec for a new repository implementation, use-case, or controller just because "it's simple" — every existing one in `src/roles/` and `src/auth/` has one, including the trivial-looking ones.
- Don't invent a DTO spec — this codebase deliberately doesn't have them; don't add the first one without checking with the user first, since it'd be a new convention, not a gap-fill.
- Don't use `--no-verify` to skip the pre-commit test run because a test is slow or flaky — fix or discuss the test instead.
