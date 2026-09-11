# PRD: Granular CASL Actions for Guards & Authorization

## Summary

Every authorization check in this repo currently uses the CASL wildcard `Action.Manage`, so a role either has full CRUD on a subject or has nothing at all — there's no way to express "can read but not delete." This PRD replaces those `Action.Manage` checks with the granular `Create`/`Read`/`Update`/`Delete` actions (already defined in `Action` but currently unused) across the four subjects CASL already knows about: `Role`, `User`, `Category`, `Product`.

## Problem

`src/authorization/ability/casl-ability.factory.ts` builds a user's ability with a single binary rule:

```ts
if (roleName === MANAGER_ROLE_NAME) {
  can(Action.Manage, 'Role');
  can(Action.Manage, 'User');
  can(Action.Manage, 'Category');
  can(Action.Manage, 'Product');
}
```

`manager` gets full CRUD (via the `manage` wildcard) on all four subjects; `client` gets nothing — no `can()` calls run for any other role name, so every ability check fails closed. Every `@CheckPolicies` call site across `RolesController`, `UsersController`, `CategoriesController`, `ProductsController`, and `ProductVariantsController` checks `Action.Manage`, confirmed via a full-repo search — there are no other action checks in use today.

`Action.Create`, `Action.Read`, `Action.Update`, and `Action.Delete` already exist in `src/authorization/ability/action.enum.ts` but are dead code — grepping for `Action\.` outside that file shows every reference is `Action.Manage`. This PRD is about wiring up those existing actions, not introducing new ones.

This binary model means it's impossible today to grant a role read-only or partial access to a subject — a role either can do everything CASL guards for, or nothing.

## Goals

- Replace every `Action.Manage` check (in the ability factory and in every `@CheckPolicies` call site) with the specific `Create`/`Read`/`Update`/`Delete` action that matches what the route actually does.
- Grant `manager` full, explicit CRUD (`Create`, `Read`, `Update`, `Delete`) on all four existing subjects (`Role`, `User`, `Category`, `Product`), replacing the `Action.Manage` wildcard grant.
- Grant `client` `Action.Read` on `Category` and `Product` (formalizing read access at the ability-matrix level); `client` continues to have no grants on `Role` or `User`.
- Remove `Action.Manage` from the `Action` enum once nothing references it, so no dead code is left behind.
- Update `casl-ability.factory.spec.ts` and any controller specs asserting `Action.Manage` behavior to reflect the new per-action grants.

## Non-Goals

- Modeling `Cart`, `CartItem`, `ProductVariant`, or `LikedProductVariant` as CASL subjects. These currently bypass CASL entirely via `@CheckPolicies(() => true)` with manual `req.user.sub` ownership checks in their use-cases, and stay that way.
- Changing the fully public, unguarded status of `GET /products`, `GET /products/:id`, `GET /categories`, `GET /categories/:id`, and `GET /product-variants/product/:id` — confirmed via direct inspection that none of these routes carry `@UseGuards` at all today (not even `JwtAuthGuard`). They remain anonymous/public. `client`'s new `Read` grant on `Product`/`Category` has no observable effect on these specific routes today (there's no guard evaluating it); it exists for consistency in the ability matrix and so the grant is already in place if any of these routes becomes CASL-gated later.
- Changing the `@CheckPolicies(() => true)` self-service bypass routes: `PATCH /users/password`, `PATCH /users/profile`, `GET /products/liked`, `GET /products/disabled`, `GET /product-variants/product/:id/liked`, `GET /product-variants/product/:id/disabled`, and the entire `CartItemsController`/`LikedProductVariantsController`. These keep using manual `req.user.sub` ownership checks rather than CASL.
- Adding new roles, changing how a role name resolves to abilities (still a hardcoded `roleName === 'manager'` string comparison), or any Prisma schema/migration change.
- Adding new API endpoints or changing any endpoint's request/response shape.

## Proposed Solution

### Ability matrix (target state)

| Subject | `manager` | `client` |
|---|---|---|
| `Role` | Create, Read, Update, Delete | *(none)* |
| `User` | Create, Read, Update, Delete | *(none)* |
| `Category` | Create, Read, Update, Delete | Read |
| `Product` | Create, Read, Update, Delete | Read |

An unrecognized role name continues to receive no grants at all (no `can()` calls execute), matching today's fail-closed behavior — this edge case is unchanged.

### Route → action mapping

Every route below currently checks `Action.Manage`; each moves to the specific action shown. Routes not listed either stay fully public/ungated or keep their existing `() => true` self-service bypass (see Non-Goals) — both are unchanged by this PRD.

**`RolesController`** (subject `Role`) — currently one class-level `@CheckPolicies(Action.Manage, 'Role')` covering all routes; moves to a per-route policy on each, matching the pattern `ProductsController`/`CategoriesController` already use:
- `POST /roles` → `Create`
- `GET /roles` → `Read`
- `PATCH /roles/:id` → `Update`
- `DELETE /roles/:id` → `Delete`

**`UsersController`** (subject `User`) — same class-level-to-per-route change. State-modifying routes that don't fit Create/Read/Delete (promoting a user, toggling disabled, anonymizing) map to `Update`, since each modifies an existing `User` record rather than creating, reading, or removing one:
- `POST /users/:id/promotion` → `Update`
- `PATCH /users/:id/disabled` → `Update`
- `DELETE /users/:id` → `Delete`
- `PATCH /users/:id/anonymize` → `Update`
- `PATCH /users/password`, `PATCH /users/profile` → unchanged (`() => true`, non-goal)

**`ProductsController`** (subject `Product`) — already per-route; each existing `Action.Manage` check becomes:
- `POST /products` → `Create`
- `PATCH /products/:id` → `Update`
- `DELETE /products/:id` → `Delete`
- `PATCH /products/:id/disabled` → `Update`
- `GET /products`, `GET /products/:id`, `GET /products/liked`, `GET /products/disabled` → unchanged (non-goal)

**`CategoriesController`** (subject `Category`):
- `POST /categories` → `Create`
- `PATCH /categories/:id` → `Update`
- `DELETE /categories/:id` → `Delete`
- `GET /categories`, `GET /categories/:id` → unchanged (non-goal)

**`ProductVariantsController`** (subject `Product` — reused as-is; this PRD does not introduce a separate `ProductVariant` subject):
- `POST /product-variants` → `Create`
- `PATCH /product-variants/:id` → `Update`
- `DELETE /product-variants/:id` → `Delete`
- `GET /product-variants/product/:id`, `.../liked`, `.../disabled` → unchanged (non-goal)

### Enum cleanup

Once every call site above is migrated, `Action.Manage` has no remaining references anywhere in `src/`. Remove it from `src/authorization/ability/action.enum.ts` rather than leaving it defined and unused.

## Scope / Affected Areas

- `src/authorization/ability/action.enum.ts` — remove `Manage`.
- `src/authorization/ability/casl-ability.factory.ts` — replace the four `Action.Manage` calls with the full matrix above (16 `can()` calls for `manager`, 2 for `client`).
- `src/authorization/ability/casl-ability.factory.spec.ts` — rewrite assertions currently hardcoded to `Action.Manage` to cover the new per-action, per-subject, per-role matrix.
- `src/roles/presentation/controllers/roles.controller.ts` — split the single class-level policy into 4 per-route policies.
- `src/users/presentation/controllers/users.controller.ts` — split the single class-level policy into per-route policies for `promote`, `toggleDisabled`, `deleteUser`, `anonymizeUser`.
- `src/products/presentation/controllers/products.controller.ts`, `src/categories/presentation/controllers/categories.controller.ts`, `src/product-variants/presentation/controllers/product-variants.controller.ts` — update each existing `Action.Manage` call site to its mapped action.
- Any `*.controller.spec.ts` for the controllers above that assert on `@CheckPolicies`/`Action.Manage` behavior.
- No Prisma schema, migration, or new-endpoint changes.

## Implementation Phases

Each phase must land with `pnpm lint && pnpm test` green and leave every route enforcing the same effective permissions as before that phase started — no phase should be a behavior regression on its own. `Action.Manage` can't be removed from the enum until nothing references it, so phases 1–3 keep it defined and temporarily grant it alongside the new granular actions; only phase 4 removes it.

**Phase 1 — Ability factory grants both old and new actions.**
Update `casl-ability.factory.ts` so `manager` receives `Action.Manage` (kept, temporarily) *and* the full explicit `Create`/`Read`/`Update`/`Delete` matrix on all four subjects; `client` gains `Action.Read` on `Category` and `Product`. No controller changes yet — every existing `@CheckPolicies` check still passes because `Action.Manage` is still granted.
*Done when:* `casl-ability.factory.spec.ts` asserts both the retained `Action.Manage` grants and the full new matrix from the Proposed Solution table; `pnpm lint && pnpm test` pass; no controller file is touched.

**Phase 2 — Migrate the controllers that are already per-route.**
In `ProductsController`, `CategoriesController`, and `ProductVariantsController`, swap each `@CheckPolicies((ability) => ability.can(Action.Manage, ...))` for the specific action from the Route → action mapping table. This is a pure decorator-argument swap — no restructuring, since these controllers already check policies per-route rather than per-class.
*Done when:* `grep -rn "Action.Manage" src/products src/categories src/product-variants` returns no results; each controller's spec asserts the new specific action instead of `Action.Manage`; `pnpm lint && pnpm test` pass.

**Phase 3 — Migrate the class-level controllers to per-route policies.**
`RolesController` and `UsersController` each move from a single class-level `@CheckPolicies(Action.Manage, ...)` to a per-route policy on each handler, per the Route → action mapping table (including mapping `promote`/`toggleDisabled`/`anonymize` to `Update`). This is the larger diff flagged under Risks, since it changes decorator placement, not just its argument.
*Done when:* `grep -rn "Action.Manage" src/roles src/users` returns no results; the class-level `@CheckPolicies` is gone from both controllers; each route's spec asserts its own specific action; the `() => true` routes (`password`, `profile`) are untouched; `pnpm lint && pnpm test` pass.

**Phase 4 — Remove `Action.Manage`.**
With every call site migrated, drop the temporary `Action.Manage` grants from `casl-ability.factory.ts` and delete `Manage` from `action.enum.ts`.
*Done when:* all Success Criteria below hold.

## Success Criteria

- `grep -rn "Action.Manage" src/` returns no results, and `Manage` is not defined in `action.enum.ts`.
- `CaslAbilityFactory.createForUser('manager')` returns an ability where `can(Create|Read|Update|Delete, Role|User|Category|Product)` is `true` for all 16 combinations.
- `CaslAbilityFactory.createForUser('client')` returns an ability where `can(Read, Category)` and `can(Read, Product)` are `true`, and every other action/subject combination on all four subjects is `false`.
- An unrecognized role name still yields an ability where every `can(...)` check is `false` (unchanged fail-closed behavior).
- Every route listed in the mapping table above enforces the specific mapped action (verified by controller specs mocking `PoliciesGuard`/`CheckPolicies` per `.claude/rules/testing.md`), not `Action.Manage`.
- `pnpm lint && pnpm test` pass with the rewritten `casl-ability.factory.spec.ts` and any updated controller specs.
- The previously public/ungated and `() => true` bypass routes listed under Non-Goals behave identically before and after this change.

## Risks & Open Considerations

- `client`'s new `Read` grant on `Category`/`Product` is currently unenforced by any route (those `GET` endpoints have no guard at all), so it has no observable runtime effect today — it's included for ability-matrix consistency and to be ready if those routes are gated later. Flagged here so it isn't mistaken for a behavior change.
- Splitting `RolesController` and `UsersController` from a single class-level `@CheckPolicies` to multiple per-route ones is a larger diff than the `Action.Manage → <specific action>` substitution elsewhere, since it also touches decorator placement, not just the decorator's argument.
