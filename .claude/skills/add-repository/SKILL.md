---
name: add-repository
description: Orchestrates adding or extending a Prisma-backed repository in this repo — the abstract <Entity>Repository port, the Prisma<Entity>Repository adapter, its persistence mapper, module binding/export, and any Prisma schema change it needs — without adding routes. Gathers the contract the implementer can't infer (query methods, soft-delete and not-found semantics, schema/relations, cross-module consumers), delegates to backend-engineer/test-engineer, then independently re-verifies lint/build/test. Use when the user asks to "add a repository", "create a repository for <entity>", "add a query/method to <X>Repository", "persist <entity> without an endpoint", or needs a repository-only module like carts.
metadata:
  type: workflow
---

# Add Repository

Owns the arc from "user needs persistence for an entity, or a new query on one" to "repository exists, is bound, tested, and green." Use it when the work is persistence-only: a repository that use-cases or other modules consume, with no new routes. It stops at a verified but uncommitted state.

## Boundary

- **Not for new routes.** If the request includes a controller or endpoint, use `add-endpoint`. Its step 3 already covers the persistence decision, and its delegation includes the repository layer.
- **Not for external systems.** A class wrapping S3, a queue, SMTP, or a payment API is `add-service`. A repository here persists this app's own entities in Postgres via `PrismaService`.
- **Doesn't implement code or write specs itself.** That's `backend-engineer`, then `test-engineer`, per CLAUDE.md's delegation mandate.
- **Doesn't commit, push, or open a PR.** The last step points to `verify-and-commit`.

The layering itself (port in `infrastructure/repositories/`, `Prisma*` adapter extending it, `infrastructure/mappers/*-persistence.mapper.ts`, the `{ provide: X, useClass: PrismaX }` binding) is defined in CLAUDE.md's Architecture section. Don't restate it in the contract; point the implementer at a reference instead.

## Repository shapes in this repo

| Situation | What changes | Reference |
|---|---|---|
| **New method on an existing repository** | Add the abstract method to the port, implement it in the `Prisma*` adapter, and extend the mapper if new fields appear | `src/promos/infrastructure/repositories/promo.repository.ts` (`getPromoByCode`) |
| **New repository inside an existing domain** | Port + adapter + persistence mapper + binding in that domain's module | `src/auth/infrastructure/repositories/` (`RefreshTokenRepository`, `PasswordResetTokenRepository` alongside `UserRepository`) |
| **Repository-only module** | New `src/<domain>/` with only `domain/models/` + `infrastructure/`, a module with no controller that `exports: [<Port>]`, and consumers importing that module | `src/carts/` (consumed by `auth` and `cart-items`) |
| **Exporting an existing repository to another domain** | Add the port to the owning module's `exports`, and import that module from the consumer | `src/auth/auth.module.ts` `exports: [UserRepository]` → `src/users/users.module.ts` |

## Steps

1. **Gather requirements before delegating.** `backend-engineer` has no memory of this conversation. If any of these is unclear, ask via `AskUserQuestion` instead of guessing:
   - The entity, and whether a domain model already exists in `src/<domain>/domain/models/`. If not, its fields need `static create()` and `static restore()` per `.claude/rules/code-style.md`.
   - Each method: its name, parameters, return type, filtering, ordering, and whether it returns `X | null` or throws when nothing is found.
   - **Soft-delete semantics, per read method.** Every model has a nullable `deletedAt`. Decide explicitly whether each read excludes soft-deleted rows (`where: { deletedAt: null }`, as in `getAllPromos` and `getPromoByCode`) or includes them (`getPromoById` uses `findUnique` by id with no filter). Don't let the implementer infer this.
   - **Not-found on writes.** The existing convention is to catch Prisma `P2025` in `update`/`delete` and throw the domain's `<Entity>NotFoundError` (`prisma-promo.repository.ts`). Confirm that the error class exists or must be created in `domain/errors/`. Uniqueness violations (`P2002`) are either left to the global `PrismaExceptionFilter` or translated into a domain error such as `RoleAlreadyExistsError`. Decide which one applies.
   - **Atomicity.** If one method must write multiple rows together, it uses `this.prisma.$transaction([...])` inside the adapter (`prisma-category.repository.ts`, `prisma-product.repository.ts`). Transactions never leak into use-cases.
   - Who consumes it: use-cases in the same module, or other modules (which then need `exports` and an import).

2. **Check for reuse.** Grep `src/**/infrastructure/repositories/*.repository.ts` for an existing port covering this entity. A new query on an existing entity is a new method on its repository, never a second repository for the same model.

3. **Work out the Prisma schema angle now, not during delegation.** Read `prisma/schema.prisma` (not `generated/`):
   - **No change**: the model and fields already exist.
   - **Extend a model**: new fields on the same entity's lifecycle.
   - **New model**: a separately persisted entity. Use a UUID `id`, nullable `deletedAt`, `createdAt`/`updatedAt`, snake_case `@map`/`@@map` columns, matching every existing model.
   - For any relation, resolve which side owns the foreign key, the cardinality, and whether deletes cascade or soft-delete independently.
   - Any schema change means `pnpm prisma migrate dev --name <name>` and `pnpm prisma generate`, and the migration file belongs in the contract's file list.

4. **Compile a delegation contract** and hand it to both downstream roles verbatim:

   ```yaml
   outcome: "<what can be persisted/queried after this change>"
   situation: "<new method | new repository in existing domain | repository-only module | export existing repository>"
   entity:
     domain_model: "<existing path | new: fields + create()/restore()>"
     port: "<path of abstract <Entity>Repository>"
     adapter: "<path of Prisma<Entity>Repository>"
     mapper: "<path of <entities>-persistence.mapper.ts, new or extended>"
   methods:
     - signature: "<name(params): Promise<ReturnType>>"
       query: "<Prisma call and where/orderBy/include>"
       soft_deleted: "<excluded | included | n/a (write)>"
       not_found: "<returns null | throws <Entity>NotFoundError on P2025 | n/a>"
       conflicts: "<P2002 -> global PrismaExceptionFilter | P2002 -> <DomainError> | n/a>"
       transaction: "<none | $transaction([...]) of: ...>"
   persistence:
     decision: "<no change | extend model | new model>"
     schema_changes: "<fields/models/relations, or none>"
     migration: "<migration name, or none>"
   wiring:
     module: "<module that binds { provide: <Port>, useClass: <Adapter> }>"
     exports: ["<Port>, or none"]
     consumers: ["<module importing it, and which use-cases inject the port>"]
   acceptance_cases:
     - "<given stored rows, when a method is called, expect a result or error>"
   references: ["<closest analog paths, e.g. src/promos/infrastructure/, src/carts/>"]
   unresolved: []
   ```

   - Every read method needs an explicit `soft_deleted` value, and every write method an explicit `not_found` value. A blank means the decision was skipped.
   - `unresolved` is an honest list. An empty list claims that everything was actually resolved.

5. **Delegate implementation** to `backend-engineer`, passing the full contract as the Agent prompt.

6. **Delegate coverage** to `test-engineer`, passing the contract and `backend-engineer`'s handoff summary verbatim. Expected coverage, per `.claude/rules/testing.md`:
   - `prisma-<entity>.repository.spec.ts`, which constructs the adapter with `new` and a hand-built `{ <model>: { <only the methods called>: jest.fn() } }` stub (see `prisma-cart.repository.spec.ts`).
   - Per method: the mapped domain result, the `where` clause it was called with (this is how soft-delete semantics get pinned down), and the `P2025` → `<Entity>NotFoundError` translation where the contract specifies it.
   - Any use-case spec that already mocks this port as `jest.Mocked<Port>` must stub the new abstract method too, so the mock still covers the full abstract class shape.

7. **Independently re-verify.** Rerun `pnpm lint && pnpm build && pnpm test` yourself; don't trust either role's self-report. After a schema change, also confirm that `pnpm prisma generate` ran and the migration file exists under `prisma/migrations/`. When a module gained `exports` or a new import, boot the app once to catch DI resolution errors that unit specs can't. Follow `add-endpoint` step 7's port-3000 rules: check the port first, and stop only the process you started.

8. **Report and stop.** Summarize the methods, schema/migration changes, and wiring. Suggest `verify-and-commit`, then `pr`. Don't invoke either yourself.

## Common pitfalls

- Leaving soft-delete filtering implicit, so one read excludes deleted rows and its sibling silently doesn't.
- Returning Prisma records (or `generated/prisma` types) from the port instead of domain models mapped through the persistence mapper.
- Throwing `HttpException` from the adapter. Repositories throw domain errors, and use-cases translate them.
- Adding an abstract method to a port without stubbing it in every existing `jest.Mocked<Port>` object literal in use-case specs. `.claude/rules/testing.md` requires those mocks to cover the full abstract class shape.
- Consuming another domain's repository without the owning module exporting it, which fails only at boot.
- Creating a second repository for an existing model instead of adding a method to its port.
- Starting a `$transaction` in a use-case instead of encapsulating it in one adapter method.
- Doing the implementation yourself instead of delegating, or continuing into commit/PR.
