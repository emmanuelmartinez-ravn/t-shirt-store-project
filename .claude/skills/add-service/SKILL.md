---
name: add-service
description: Orchestrates adding a NestJS service to this repo — an application service shared across use-cases, an abstract port + concrete adapter for an external system (storage, queue, payment, email), or a concrete service wrapping a third-party client injected via a factory token. Classifies the service shape, gathers the contract the implementer can't infer (methods, consumers, env vars, module exports), delegates to backend-engineer/test-engineer, then independently re-verifies lint/build/test. Use when the user asks to "add a service", "create a service", "add an S3/storage/queue/payment service", "integrate <external system>", or "extract shared logic from use-cases into a service".
metadata:
  type: workflow
---

# Add Service

Owns the arc from "user wants a new service" to "service exists, is wired, tested, and green." It is a sibling of `add-endpoint` and `add-repository`: it stops at a verified but uncommitted state.

## Boundary

- **Not for a REST endpoint.** If the request includes new routes, use `add-endpoint`. That skill may need a service as one piece, but the route-level contract lives there.
- **Not for persistence of a domain entity.** A Prisma-backed `*Repository` port and adapter is `add-repository`, even though it is "a class that talks to an external system." A service here talks to something other than this app's own Postgres tables (S3, BullMQ, SMTP, JWT, a payment API), or holds pure application logic.
- **Not for a single-use helper.** Logic used by exactly one use-case stays in that use-case. A service is justified when a second consumer exists, or when it isolates an external system behind a port.
- **Doesn't implement code or write specs itself.** That's `backend-engineer`, then `test-engineer`, per CLAUDE.md's delegation mandate.
- **Doesn't commit, push, or open a PR.** The last step points to `verify-and-commit`.

## The three service shapes in this repo

Every service must be classified as exactly one of these. Don't invent a fourth.

| Shape | When | Location | DI wiring | Reference |
|---|---|---|---|---|
| **Application service** | Domain logic shared by 2+ use-cases in the same domain, using only that domain's repositories/models plus framework helpers like `JwtService` | `src/<domain>/application/services/<name>.service.ts` | Concrete `@Injectable()` class listed directly in `providers`; no port | `src/auth/application/services/issue-auth-tokens.service.ts` |
| **Integration port + adapter** | Use-cases need an external capability (file storage, a queue, a payment gateway), and the vendor should stay swappable and mockable | Port: `services/<capability>.service.ts` (abstract class). Adapter: `services/<vendor>-<capability>.service.ts` (`extends` the port) | `{ provide: <Port>, useClass: <Adapter> }`, and `exports: [<Port>]` when other modules consume it | `src/mail/services/email-queue.service.ts` + `bullmq-email-queue.service.ts` |
| **Factory-token client service** | A concrete service wrapping a third-party SDK client that needs env-driven construction | Service in `services/`. Factory in `config/<client>.ts`. Token constant in `<module>.constants.ts` | `{ provide: <TOKEN>, useFactory: create<Client> }` + `@Inject(<TOKEN>)` in the constructor | `src/mail/services/mailer.service.ts` + `src/mail/config/mailer-transport.ts` + `MAIL_TRANSPORTER` |

The last two shapes combine when an integration needs both: an adapter that `extends` the port can also `@Inject` a factory-built client. For example, an `S3FileStorageService extends FileStorageService` that injects an `S3_CLIENT` built by `config/s3-client.ts` from `AWS_*` env vars. Record both shapes in the contract when that's the case.

**Placement rule.** A service that belongs to one business domain lives inside that domain's layer folders (`application/services/`). A cross-cutting integration consumed by several domains gets its own top-level module using the flat layout that `src/mail/` and `src/prisma/` already use (`services/`, `config/`, `<module>.constants.ts`, `<module>.module.ts`), not the four-layer domain layout. Consuming modules import it explicitly; never make it `@Global()`.

## Steps

1. **Gather requirements before delegating.** `backend-engineer` has no memory of this conversation. If any of these is unclear, ask via `AskUserQuestion` instead of guessing:
   - What the service does, as a list of methods with parameters, return types, and failure behavior.
   - Who consumes it: which existing or planned use-cases, and in which modules.
   - The external system and SDK, if any. Check `package.json` to see whether the SDK is already installed. If it isn't, the install belongs in the contract.
   - Configuration: which env vars it reads, and their defaults. Every new var must also land in `.env.example` with a comment, following the existing sections there. This repo has no `ConfigModule`: config is read from `process.env` inside a `config/*.ts` factory or helper (see `mailer-transport.ts`, and `getAccessTokenTtlSeconds()` in `issue-auth-tokens.service.ts`).
   - How failures surface. A service throws plain domain `Error` subclasses or lets SDK errors propagate. Only use-cases translate errors into Nest `HttpException`s (`.claude/project/architecture.md`, "Don'ts").

2. **Check for reuse.** Grep `src/**/services/` and `src/**/*.module.ts` `exports` for an existing service or port that already covers this capability. Extending an existing port with a method beats a parallel service.

3. **Classify the shape** using the table above, and decide placement: an existing domain, an existing cross-cutting module (`mail`, `prisma`), or a new top-level module. If the choice is ambiguous (for example, whether it needs a port at all), apply this test: does a use-case call it, and would mocking it in that use-case's spec otherwise require mocking an SDK? If yes, it needs a port.

4. **Compile a delegation contract** and hand it to both downstream roles verbatim:

   ```yaml
   outcome: "<capability the service provides>"
   shape: "<application-service | integration-port-adapter | factory-token-client | integration-port-adapter + factory-token-client>"
   placement:
     module: "<src/<domain> | src/<new-module> (flat layout)>"
     files: ["<port path>", "<adapter/service path>", "<config factory path>", "<constants path>"]
   api:
     - method: "<name(params): ReturnType>"
       behavior: "<what it does>"
       failures: ["<condition -> thrown Error subclass, or propagated SDK error>"]
   dependencies:
     sdk: "<package@version, already installed | to install via pnpm add | none>"
     injects: ["<repositories/services/tokens the class needs>"]
   config:
     env_vars: ["<NAME (default)>"]
     env_example: "<section to add to .env.example | none>"
   wiring:
     providers: ["<provider entries, e.g. { provide: FileStorageService, useClass: S3FileStorageService }>"]
     exports: ["<ports exported to other modules | none>"]
     consumers: ["<module that must import this one, and which use-cases inject it>"]
   acceptance_cases:
     - "<given a condition, when a method is called, expect an outcome>"
   references: ["<closest existing analog file paths>"]
   unresolved: []
   ```

   - `shape` must be one of the table's shapes, or the documented combination. Never leave it blank.
   - `unresolved` is an honest list. An empty list claims that everything was actually resolved.
   - If the service has no consumer yet (groundwork for a later feature), say so under `wiring.consumers`. That way nobody wires a use-case speculatively.

5. **Delegate implementation** to `backend-engineer`, passing the full contract as the Agent prompt.

6. **Delegate coverage** to `test-engineer`, passing the contract and `backend-engineer`'s handoff summary verbatim. Expected spec coverage:
   - Specs go on the concrete adapter or service, constructed with `new` and given a hand-built stub of the SDK client, queue, or transporter, as in `bullmq-email-queue.service.spec.ts` and `mailer.service.spec.ts`. The abstract port gets no spec of its own, matching `email-queue.service.ts`.
   - Application services get a spec with a `jest.Mocked<...Repository>` and mocked collaborators, as in `issue-auth-tokens.service.spec.ts`.
   - Any consuming use-case specs mock the port as a plain object (`{ method: jest.fn() } as jest.Mocked<Port>`), never the adapter.
   - No test hits the real external system. A spec that needs live AWS, Redis, or SMTP access is a defect.

7. **Independently re-verify.** Rerun `pnpm lint && pnpm build && pnpm test` yourself; don't trust either role's self-report. Also confirm that every env var in the contract appears in `.env.example`. Starting the app is only worth it when module wiring changed in a way specs can't catch (a new module imported into `app.module.ts`, or a factory token). Follow `add-endpoint` step 7's port-3000 rules if you do: check the port first, and stop only the process you started.

8. **Report and stop.** Summarize the shape, files, wiring, env vars, and SDK changes. Suggest `verify-and-commit`, then `pr`. Don't invoke either yourself.

## Common pitfalls

- Throwing `HttpException` from a service. Only use-cases translate errors into HTTP errors.
- Injecting a concrete adapter (`S3FileStorageService`) into a use-case instead of the port (`FileStorageService`). This defeats the port and forces specs to mock the SDK.
- Constructing an SDK client inline in the service constructor (`new S3Client(...)`) instead of a factory token. The client becomes impossible to stub without `jest.mock`, which `.claude/rules/testing.md` rules out.
- Reading `process.env` scattered through service methods instead of in one `config/*.ts` factory or helper.
- Adding env vars without updating `.env.example`.
- Marking a cross-cutting module `@Global()` instead of having consumers import it explicitly.
- Forgetting `exports: [<Port>]` on the providing module, which fails at boot with a Nest "can't resolve dependencies" error that unit specs don't catch.
- Extracting a "service" with a single consumer. Inline logic in its one use-case is the repo's default.
- Doing the implementation yourself instead of delegating, or continuing into commit/PR.
