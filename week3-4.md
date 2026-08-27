# 🚀 Week 3 & 4 - Building and Shipping the NestJS API

:::info
Duration: 2 weeks

:::

## Introduction

> NestJS is a framework for building efficient, scalable Node.js web applications. It uses modern JavaScript, is built with TypeScript, and combines elements of OOP (Object Oriented Programming), FP (Functional Programming), and FRP (Functional Reactive Programming).

Building an API is only part of the job. Running it in production is the other. Over this block you finish the core NestJS topics from Week 2, the request lifecycle, authentication and authorization, security hardening, API documentation, and payments, and then turn the result into a production-ready service: background processing, end-to-end testing, delivery pipelines, observability, and security hardening.

The capstone implementation runs across the whole block. You write the API and its unit tests together, testing each piece as you build it, and once the paths that already work start getting touched again by later changes, you add end-to-end tests over them rather than trusting that the unit tests alone still tell the truth. Two checkpoints anchor the pace: partway through, authentication, products, and SKUs implemented and unit-tested; by the end, the full API wired up end to end, end-to-end tests over authentication, checkout, and order history, and a one-page architecture write-up from the design review below.

---

## Tests and Guardrails for This Block

Testing alongside development, rather than as a separate phase at the end, gives you a faster feedback loop, forces better-structured code (code that is hard to test is usually poorly structured), and means the coverage you write actually ships instead of being the first thing cut under deadline pressure.

This block is where that habit pays for itself the most. The surface area is unusually large: authentication, payments, queues, and checkout all get built or changed here, and pieces you finish early (auth, products, SKUs) get touched again once checkout and background jobs are wired in on top of them. A unit test tells you a piece still works on its own; it says nothing about whether the seam between that piece and the rest still holds once you start rewiring what sits around it. That is why `Unit Testing` and `End-to-End Testing` sit back to back in the Content section below, and why neither one is optional.

The same instinct, catch a problem before it costs you a review session, applies to automation outside your test files. Two kinds are worth telling apart:

|                   | Git hook (pre-commit, husky)                               | Claude Code hook                                                                   |
| ----------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Fires on          | `git commit`                                               | A tool-use event inside a Claude Code session                                      |
| Enforces          | Lint, typecheck, and tests before code reaches a branch    | An action the harness runs no matter what the model decides                        |
| Bypassable        | Yes, with `--no-verify`                                    | No, once configured                                                                |
| Reach for it when | You want a correctness gate at commit time, for any author | You want something guaranteed inside every session, without relying on being asked |

Both are worth having by the time this block's surface area (auth, payments, queues, webhooks) is this large: manual discipline alone will not catch everything. Setting either of these up is covered in [Working with Claude Code](https://ravn.getoutline.com/doc/working-with-claude-code-AaKqW1tQv8)'s **Safety rails** section; this is a pointer, not a repeat of it.

---

## Requirements

- Code Editor (like VSCode)
- NPM or NVM
- Node.js
- Git
- Docker
- PostgreSQL
- Redis (required for the queue-based stock-notification job)
- Stripe CLI

---

## What you'll learn

- The NestJS request lifecycle
- Authentication and authorization, including role-based access control with CASL
- Encryption and hashing
- Securing an API: CORS, Helmet, and rate limiting
- Documenting an API with OpenAPI/Swagger
- Integrating Stripe for payments, including webhook handling
- Background processing with queues and async handlers
- Unit testing best practices: happy path, edge cases, and wrong paths
- Explicit vs. implicit assertions (e.g. `toHaveBeenCalledWith` vs `toEqual`)
- Unit testing vs. integration testing
- The NestJS testing module and mocking strategies
- TDD and BDD
- End-to-end testing as a regression net over the capstone's critical paths
- CI/CD strategies for Node.js services
- Observability: logs, metrics, and traces
- Securing webhooks (signature verification, replay protection)
- The OWASP Top 10 and API security risks
- Reviewing a system design: what to queue, what to monitor, and where it fails

---

## System Design Review

Start thinking about this in Week 3, alongside the implementation: how would you take the T-Shirt Store API to production? This is an individual exercise, not a group workshop. You work through the agenda below on your own and defend your answers in your review session.

Revisit it as the implementation changes what you would actually do. Every item connects to a Content topic below, so read ahead.

| Question                                 | What you should be able to defend                                                                                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What comes off the request path?         | Which work is queued, which is synchronous, and why. Stock notifications and emails are the obvious candidates. What happens to a job that fails twice?          |
| How does it deploy?                      | What runs where, how a migration reaches production without downtime, and how you roll back a bad release.                                                       |
| What happens if a request fails halfway? | A payment succeeds but stock decrement fails, or the reverse. Where is the seam that would leave money and stock disagreeing, and what makes a retry safe there? |
| Where are the security risks?            | Your top three from the OWASP list, specific to this API rather than generic. Webhook replay is a good place to start.                                           |
| How do you know it still works?          | Which critical paths are covered end to end. Name one regression that would reach production unnoticed today.                                                    |

:::success
**Deliverable: a one-page architecture write-up.** A general diagram of your system as it would run in production, agnostic of any specific platform, showing the components you'd expect: the API, the database including how connections are pooled, the queue, and how CI/CD gets a change from a commit to deployed. Add a short rationale covering the queue decision, the deploy shape, and what you would monitor. Write it as your thinking settles, revise it as the implementation changes it, and hand it in by the end of Week 4. One page. The constraint is the point: if you cannot fit it on a page, you do not have a design yet, you have a list of components. The main goal is to be able to defend it.

:::

---

## Content

### Request Lifecycle & Security

| Name                            | Author | Kind     | Link                                                                                       |
| ------------------------------- | ------ | -------- | ------------------------------------------------------------------------------------------ |
| NestJS - Request Lifecycle      | NestJS | Required | [NestJS - Request Lifecycle](https://docs.nestjs.com/faq/request-lifecycle)                |
| NestJS - Authentication         | NestJS | Required | [NestJS - Authentication](https://docs.nestjs.com/security/authentication)                 |
| NestJS - Authorization          | NestJS | Required | [NestJS - Authorization](https://docs.nestjs.com/security/authorization)                   |
| NestJS - Encryption and Hashing | NestJS | Required | [NestJS - Encryption and Hashing](https://docs.nestjs.com/security/encryption-and-hashing) |
| NestJS - CORS                   | NestJS | Required | [NestJS - CORS](https://docs.nestjs.com/security/cors)                                     |
| NestJS - Helmet                 | NestJS | Required | [NestJS - Helmet](https://docs.nestjs.com/security/helmet)                                 |
| NestJS - Rate Limiting          | NestJS | Required | [NestJS - Rate Limiting](https://docs.nestjs.com/security/rate-limiting)                   |

### Authorization with CASL

| Name                             | Author | Kind     | Link                                                                                         |
| -------------------------------- | ------ | -------- | -------------------------------------------------------------------------------------------- |
| NestJS - Authorization with CASL | NestJS | Required | [NestJS - CASL integration](https://docs.nestjs.com/security/authorization#integrating-casl) |
| CASL - Introduction              | CASL   | Required | [CASL - Introduction](https://casl.js.org/v6/en/guide/intro)                                 |

### API Documentation & Techniques

| Name                                               | Author | Kind     | Link                                                                                                     |
| -------------------------------------------------- | ------ | -------- | -------------------------------------------------------------------------------------------------------- |
| NestJS - OpenAPI (Complete Section)                | NestJS | Required | [NestJS - OpenAPI (Complete Section)](https://docs.nestjs.com/openapi/introduction)                      |
| NestJS - Comments Introspection                    | Trilon | Required | [NestJS - Comments Introspection](https://trilon.io/blog/eliminating-redundancy-with-nestjs-cli-plugins) |
| NestJS - Swagger API Documentation Tips and Tricks | Trilon | Required | [NestJS - Swagger API Documentation Tips and Tricks](https://trilon.io/blog/nestjs-swagger-tips-tricks)  |
| NestJS - Task Scheduling                           | NestJS | Required | [NestJS - Task Scheduling](https://docs.nestjs.com/techniques/task-scheduling)                           |
| NestJS - Queues                                    | NestJS | Required | [NestJS - Queues](https://docs.nestjs.com/techniques/queues)                                             |
| NestJS - Events                                    | NestJS | Required | [NestJS - Events](https://docs.nestjs.com/techniques/events)                                             |
| NestJS - Logging                                   | NestJS | Required | [NestJS - Logging](https://docs.nestjs.com/techniques/logger)                                            |
| NestJS - HTTP Module                               | NestJS | Required | [NestJS - HTTP Module](https://docs.nestjs.com/techniques/http-module)                                   |

### Payments with Stripe

| Name                                | Author | Kind     | Link                                                                                 |
| ----------------------------------- | ------ | -------- | ------------------------------------------------------------------------------------ |
| Stripe - Payment Links              | Stripe | Required | [Stripe - Payment Links](https://docs.stripe.com/payment-links)                      |
| Stripe - Payment Intents            | Stripe | Required | [Stripe - Payment Intents](https://docs.stripe.com/payments/payment-intents)         |
| Stripe - Webhooks                   | Stripe | Required | [Stripe - Webhooks](https://docs.stripe.com/webhooks)                                |
| Stripe - Test webhooks with the CLI | Stripe | Required | [Stripe - Test webhooks with the CLI](https://docs.stripe.com/webhooks#test-webhook) |

### Queues & Async Handlers

Moving work off the request/response cycle is one of the most impactful things you can do for API reliability. NestJS integrates with several queue and messaging technologies, each with different trade-offs around persistence, throughput, ordering, and operational complexity.

| Option              | Type                     | NestJS Integration                        | Best for                                                             |
| ------------------- | ------------------------ | ----------------------------------------- | -------------------------------------------------------------------- |
| **BullMQ**          | Redis-backed job queue   | `@nestjs/bullmq`                          | General-purpose background jobs, delayed tasks, retries with backoff |
| **Bull** _(legacy)_ | Redis-backed job queue   | `@nestjs/bull`                            | Same as BullMQ; prefer BullMQ for new projects                       |
| **RabbitMQ**        | AMQP message broker      | `@nestjs/microservices` (AMQP transport)  | Fan-out, topic routing, service-to-service messaging                 |
| **Kafka**           | Distributed event log    | `@nestjs/microservices` (Kafka transport) | High-throughput event streaming, event sourcing                      |
| **Redis Streams**   | Append-only log in Redis | via `ioredis`                             | Lightweight streaming when Redis is already in the stack             |
| **AWS SQS**         | Managed cloud queue      | `@ssut/nestjs-sqs`                        | Serverless / cloud-native deployments on AWS                         |
| **NestJS Events**   | In-process event emitter | `@nestjs/event-emitter`                   | Decoupled in-process handlers; no persistence or retries             |

:::tip
For most NestJS APIs, including the T-Shirt Store, **BullMQ** is the right default: it runs on the Redis you already have, integrates natively with `@nestjs/bullmq`, and gives you retries, priorities, and delayed jobs out of the box.

:::

:::info
Use a full message broker (RabbitMQ, Kafka) only when you have multiple independent services that need to communicate asynchronously. Within a single NestJS application, BullMQ covers almost every use case.

:::

| Name                 | Author | Kind     | Link                                                         |
| -------------------- | ------ | -------- | ------------------------------------------------------------ |
| NestJS - Queues      | NestJS | Required | [NestJS - Queues](https://docs.nestjs.com/techniques/queues) |
| BullMQ Documentation | BullMQ | Required | [BullMQ Documentation](https://docs.bullmq.io/)              |
| NestJS - Events      | NestJS | Optional | [NestJS - Events](https://docs.nestjs.com/techniques/events) |

### Unit Testing

| Name                                                         | Author               | Kind     | Link                                                                                                                                               |
| ------------------------------------------------------------ | -------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| NestJS - Testing                                             | NestJS               | Required | [NestJS - Testing](https://docs.nestjs.com/fundamentals/testing)                                                                                   |
| Fundamentals of Automated Testing / Unit Test Basic Concepts | Trilon               | Required | [Fundamentals of Automated Testing](https://trilon.io/blog/fundamentals-of-automated-testing-unit-tests-basic-concepts)                            |
| What Every Unit Test Needs                                   | Eric Elliot - Medium | Required | [What Every Unit Test Needs](https://medium.com/javascript-scene/what-every-unit-test-needs-f6cd34d9836d)                                          |
| Rethinking Unit Test Assertions                              | Eric Elliot - Medium | Required | [Rethinking Unit Test Assertions](https://medium.com/javascript-scene/rethinking-unit-test-assertions-55f59358253f)                                |
| Jest - Expect (assertions)                                   | Jest Docs            | Required | [Jest - Expect](https://jestjs.io/docs/expect)                                                                                                     |
| Jest - Mock Functions                                        | Jest Docs            | Required | [Jest - Mock Functions](https://jestjs.io/docs/mock-functions)                                                                                     |
| Advanced Testing Strategies with Mocks in NestJS             | Trilon               | Required | [Advanced Testing Strategies with Mocks in NestJS](https://trilon.io/blog/advanced-testing-strategies-with-mocks-in-nestjs)                        |
| Testing Software: What is TDD                                | Eric Elliot - Medium | Required | [Testing Software: What is TDD](https://medium.com/javascript-scene/testing-software-what-is-tdd-459b2145405c)                                     |
| TDD with NestJS (Part. 1)                                    | Trilon               | Required | [TDD with NestJS (Part. 1)](https://trilon.io/blog/tdd-with-nestjs)                                                                                |
| Behavior Driven Development (BDD) and Functional Testing     | Eric Elliot - Medium | Required | [BDD and Functional Testing](https://medium.com/javascript-scene/behavior-driven-development-bdd-and-functional-testing-62084ad7f1f2)              |
| TDD with NestJS Integration Tests (Part. 2)                  | Trilon               | Optional | [TDD with NestJS Integration Tests (Part. 2)](https://trilon.io/blog/tdd-with-nestjs-integration-tests)                                            |
| Five Common Misconceptions About TDD & Unit Tests            | Eric Elliot - Medium | Optional | [Five Common Misconceptions About TDD & Unit Tests](https://medium.com/javascript-scene/5-common-misconceptions-about-tdd-unit-tests-863d5beb3ce9) |

### End-to-End Testing

The unit tests you wrote in Week 3 told you a service works in isolation. That was the right test then. It is not the test you need now.

In Week 4 of this block you finish orders and payments on top of the authentication and catalog code that already works, extend the stock-notification queue with retries and backoff, change how an order transitions after payment, and wire new background jobs into the request path. Every one of those changes touches code the checkout path depends on, including code you shipped in Week 3. Your unit tests will keep passing, because you will update the mocks along with the code. End-to-end tests are the ones that tell you the checkout path still works after all of it. That is the difference between a suite that proves your code and a suite that protects it.

**What end-to-end means here.** A real HTTP request against a running application, backed by a real PostgreSQL database, asserting on both the response and the state the request left behind. You compile a testing module with `Test.createTestingModule`, build the application from it with `moduleFixture.createNestApplication()` (the step people forget, which is why their global pipes and guards are missing), call `app.init()`, and drive it with Supertest against `app.getHttpServer()`. If your test replaces the repository, the payment service, and the queue with mocks, it is a unit test with extra ceremony: it will pass while a wrong migration, a broken guard, or a misconfigured validation pipe ships to production. Mock the things you genuinely cannot run (the Stripe API is the honest example, use its test mode or a stub), and run everything else for real.

**Three flows must be covered.** These are the deliverable, so they are stated explicitly:

1. **Authentication.** Register a user, log in and get a token, call a protected route with it and get 200, call the same route without it and get 401, call it with another user's expired or malformed token and get 401. This is the flow every other test depends on, so it is the one that has to be right first.
2. **Checkout.** Cart to order to payment to stock decrement, as one sequence in one test. Add a SKU to a cart, create the order, run the payment, then assert three things: the response, the order's status in the database, and the SKU's stock count afterward. The stock assertion is the one people skip and the one that catches the most regressions once queues are involved.
3. **Order history.** A client sees their own orders and cannot see anyone else's. Create orders for two different clients, then assert that client A's request returns only A's orders and that a direct request for one of B's order IDs is refused. A test that only checks the happy path here is not testing authorization at all.

**Test data and isolation.** Every test starts from a known state. A suite whose results depend on execution order is worse than no suite, because it fails at random and teaches everyone to rerun it instead of reading it. Pick one of these and apply it consistently:

- **Transaction rollback per test.** Open a transaction in `beforeEach`, roll it back in `afterEach`. Fastest option, but it does not work when the code under test manages its own transactions, which yours does around checkout.
- **Truncate and reseed per test.** Truncate the tables in dependency order, then insert the fixtures the test needs. Slower and dead simple to reason about. A good default for this capstone.
- **A disposable database per run with Testcontainers.** Spin up a real PostgreSQL container, run your migrations against it, throw it away at the end. This also gives you the same database in CI as on your machine, which matters more than it sounds: an in-memory substitute has different constraint, type, and transaction behavior than the database you actually deploy on, so it lets bugs through and invents ones that do not exist.

Whichever you choose, build fixtures through a helper (a user with a known password, a product with a known SKU and stock count) rather than by hand in each test. The tests get shorter and the reason each one exists gets easier to see. Keep this suite in Nest's separate `test:e2e` script rather than mixing it into the unit run: the two have different cadences, unit tests on every save and end-to-end tests before you push and in the pipeline you build below.

:::tip
**Write each test against behavior that already works.** Authentication is finished from Week 3, and products and SKUs are too if you got that far, so those tests go in **first**, before you touch anything in Week 4. Checkout and order history are Week 4's work and do not exist yet, so write their tests **as each flow lands** and before the next change touches it, not at the end of the block once everything is built.

The rule underneath is the same in both cases. A test written after the fact only describes whatever you ended up with, bugs included. A test written against behavior you have just seen work is the thing that tells you when you break it.

:::

| Name                                                | Author                     | Kind     | Link                                                                                                                  |
| --------------------------------------------------- | -------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| NestJS - Testing (End-to-End section)               | NestJS                     | Required | [NestJS - Testing (End-to-End section)](https://docs.nestjs.com/fundamentals/testing)                                 |
| Supertest                                           | Forward Email              | Required | [Supertest](https://github.com/forwardemail/supertest)                                                                |
| Testcontainers for Node.js                          | Testcontainers             | Required | [Testcontainers for Node.js](https://node.testcontainers.org/)                                                        |
| What is Testcontainers, and why should you use it   | Testcontainers             | Required | [What is Testcontainers, and why should you use it](https://testcontainers.com/guides/introducing-testcontainers/)    |
| Don't use In-Memory Databases (H2, Fongo) for Tests | Philipp Hauer              | Optional | [Don't use In-Memory Databases (H2, Fongo) for Tests](https://phauer.com/2017/dont-use-in-memory-databases-tests-h2/) |
| Configuring Jest                                    | Jest Docs                  | Optional | [Configuring Jest](https://jestjs.io/docs/configuration)                                                              |
| NestJS Unit and E2E Testing                         | Rohith Poyyeri (GrocStock) | Optional | [NestJS Unit and E2E Testing](https://dev.to/grocstock/nestjs-unit-and-e2e-testing-7pb)                               |

### CI/CD

| Name                              | Author    | Kind     | Link                                                                                                                                           |
| --------------------------------- | --------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| CI vs CD vs Continuous Deployment | Atlassian | Required | [CI vs CD vs Continuous Deployment](https://www.atlassian.com/continuous-delivery/principles/continuous-integration-vs-delivery-vs-deployment) |
| GitHub Actions Documentation      | GitHub    | Required | [GitHub Actions Documentation](https://docs.github.com/en/actions)                                                                             |
| Building and testing Node.js      | GitHub    | Optional | [Building and testing Node.js](https://docs.github.com/en/actions/use-cases-and-examples/building-and-testing/building-and-testing-nodejs)     |

### Observability

Observability is the ability to answer "why is production misbehaving?" from the outside, using three signals: **logs** (what happened), **metrics** (how much / how fast), and **traces** (where time went across services).

**What should you log?** The [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) is the reference. In short:

- **Do log:** authentication successes and failures, authorization failures, input validation failures, application errors with stack traces and context, admin or privileged actions, and payment events. Each entry needs the when, where, who, and what (ISO-8601 timestamp, service, user, event).
- **Never log:** passwords, tokens or session IDs, encryption keys, card holder data, database connection strings, or sensitive PII. Mask or redact these (Pino has built-in `redact` paths). Remember that logs are subject to GDPR too.

**Logging best practices:**

- Emit **structured JSON**, one event per line, to **stdout**; let the platform (Docker, Kubernetes) route it to a collector.
- Use **log levels** meaningfully: `debug` (off in prod), `info` (business events: order created, payment succeeded), `warn` (recoverable: a retry, a slow query), `error` (a request failed), `fatal` (process cannot continue).
- Attach a **correlation/request ID** to every line so all logs from one request can be stitched together. This is what `nestjs-pino` gives you automatically.
- Log at **service boundaries** (incoming requests, calls to the DB, Stripe, and queues), not inside every function.
- **Sample** high-volume, low-value logs on hot paths; always keep errors.

**Logger options for NestJS:**

| Tool                       | Position           | Trade-off                                                                                                                                     |
| -------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pino** (`nestjs-pino`)   | Production default | Fastest option (roughly 5x Winston throughput via async worker-thread transports), JSON-native, built-in redaction, automatic request context |
| **Winston**                | Most configurable  | Many transports and custom formats, but slower and JSON needs setup                                                                           |
| **NestJS built-in Logger** | Dev / small apps   | Zero dependencies, but no structure, redaction, or request context by default                                                                 |

| Name                                      | Author        | Kind     | Link                                                                                                              |
| ----------------------------------------- | ------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| What is Observability?                    | Honeycomb     | Required | [What is Observability?](https://www.honeycomb.io/what-is-observability)                                          |
| OpenTelemetry Documentation               | OpenTelemetry | Required | [OpenTelemetry Documentation](https://opentelemetry.io/docs/)                                                     |
| OWASP Logging Cheat Sheet                 | OWASP         | Required | [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)              |
| Node.js Logging Best Practices            | Better Stack  | Required | [Node.js Logging Best Practices](https://betterstack.com/community/guides/logging/nodejs-logging-best-practices/) |
| OpenTelemetry NestJS Implementation Guide | SigNoz        | Required | [OpenTelemetry NestJS Guide](https://signoz.io/blog/opentelemetry-nestjs/)                                        |
| OpenTelemetry Demo (Astronomy Shop)       | OpenTelemetry | Optional | [OpenTelemetry Demo](https://opentelemetry.io/docs/demo/)                                                         |
| Pino vs Winston                           | Better Stack  | Optional | [Pino vs Winston](https://betterstack.com/community/guides/scaling-nodejs/pino-vs-winston/)                       |
| nestjs-pino                               | iamolegga     | Optional | [nestjs-pino](https://github.com/iamolegga/nestjs-pino)                                                           |
| NestJS - Logging                          | NestJS        | Optional | [NestJS - Logging](https://docs.nestjs.com/techniques/logger)                                                     |

### Webhook Security

| Name                               | Author       | Kind     | Link                                                                                 |
| ---------------------------------- | ------------ | -------- | ------------------------------------------------------------------------------------ |
| Stripe - Verify webhook signatures | Stripe       | Required | [Stripe - Verify webhook signatures](https://docs.stripe.com/webhooks#verify-events) |
| Webhooks.fyi - Best practices      | webhooks.fyi | Required | [Webhooks.fyi](https://webhooks.fyi/)                                                |

### Security & OWASP

| Name                      | Author | Kind     | Link                                                                     |
| ------------------------- | ------ | -------- | ------------------------------------------------------------------------ |
| OWASP Top 10              | OWASP  | Required | [OWASP Top 10](https://owasp.org/www-project-top-ten/)                   |
| OWASP API Security Top 10 | OWASP  | Required | [OWASP API Security Top 10](https://owasp.org/www-project-api-security/) |
| OWASP Cheat Sheet Series  | OWASP  | Optional | [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)          |

---

## Complementary Content

### NestJS & Storage

| Name                                                   | Author | Kind     | Link                                                                                                                |
| ------------------------------------------------------ | ------ | -------- | ------------------------------------------------------------------------------------------------------------------- |
| Uploading Public Files to Amazon S3                    | Wanago | Required | [Uploading Public Files to Amazon S3](https://wanago.io/2020/08/03/api-nestjs-uploading-public-files-to-amazon-s3/) |
| NestJS Course Fundamentals (available on ravn account) | NestJS | Optional | [NestJS Course Fundamentals](https://learn.nestjs.com/p/fundamentals)                                               |

### Testing

| Name                                                      | Author                               | Kind     | Link                                                                                                                                                                |
| --------------------------------------------------------- | ------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit Testing Principles, Practices and Patterns (Ch. 1-3) | Vladimir Khorikov                    | Optional | [Unit Testing Principles, Practices and Patterns](https://github.com/wuzhouhui/misc2/blob/master/Manning.Unit.Testing.Principles.Practices.and.Patterns.2020.1.pdf) |
| Snapshot Testing                                          | Jest Docs                            | Optional | [Snapshot Testing](https://jestjs.io/docs/snapshot-testing)                                                                                                         |
| Jest Snapshots and Beyond                                 | Facebook Developers / Rogelio Guzman | Optional | [Jest Snapshots and Beyond](https://www.youtube.com/watch?v=HAuXJVI_bUs)                                                                                            |

:::success
Stripe workshop: a guided session on webhooks (signature verification and local testing with the Stripe CLI) will be held early in Week 3 to de-risk the payments part of the challenge.

:::

---

## Working with Claude this week

The loop from [Working with Claude Code](https://ravn.getoutline.com/doc/working-with-claude-code-AaKqW1tQv8) is unchanged across this block. What changes is the cost of getting it wrong: early on, the code you accept decides who can read whose orders and who gets charged; later, this block becomes a stack of "which tool" decisions whose reasoning outlives the code.

CASL, Stripe, and the NestJS security APIs are all heavily represented in training data at versions you are not running, so the usual failure early in the block is not an invented API but a superseded one, a CASL v5 ability shape or an older Stripe call, presented with total confidence and rendered obsolete years ago. Later, the risk shifts from "is this snippet still valid" to "is this the right tool", which is exactly what the research-with-citations pattern below is for.

- **Verify every CASL and Stripe snippet against the required readings.** Not "does it look right", but "does this API still exist with these arguments". The reading list above is the source of truth.
- **Never accept a webhook implementation you have not tested.** Signature verification either works against the Stripe CLI or it does not, and a plausible-looking implementation that skips it is a security hole, not a bug.
- **Do not let it write the assertions for code it just wrote, unit or end-to-end.** It will assert the behavior it produced, including the parts that are wrong. Write the assertions yourself; let it help with the mocking setup.
- **Use it on the request lifecycle.** Ask for a sequence diagram of one authenticated, authorized request through your guards, interceptors, pipes and service. This is the block where that flow gets complicated enough to be worth seeing.
- **Ask for the trade-off and the sources, then read the sources.** "Compare BullMQ and RabbitMQ for this application, give me the sources, and tell me what would have to be true for the answer to change." The last clause is the useful one. If you're comparing more than one option, or writing unit tests across more than one service, this is also the point to fork the work across subagents instead of working through it one at a time; see [Agentic Workflows and Instruction Files](https://ravn.getoutline.com/doc/agentic-workflows-and-instruction-files-fbkjFRgpur) for how.
- **Give it your actual constraints.** A recommendation without your context is a recommendation for someone else's system. You have one Redis, one Postgres, one service and four weeks.
- **Use it to attack your own design before your reviewer does.** Paste your architecture page and ask where it fails under load, what happens when Stripe times out mid-checkout, and what you have not monitored.

:::warning
Authorization is the single worst place in this capstone to accept code you do not fully understand. A generated CASL ability that looks correct and quietly grants a client access to another client's orders will pass every test you thought to write.

:::

:::success
You are done with this block's use of Claude when both of these are true: you have written a test that fails against a CASL ability or Stripe handler it generated, and fixed the code, not the test, to make it pass; and you can defend a tool choice from the System Design Review on your own reasoning, naming the alternative you rejected and the condition that would make you switch to it, without going back to the transcript to remember why.

:::

---

## Assignment

Implement the T-Shirt Store API, based on the ERD from Week 1 and the OpenAPI (Swagger) design from Week 2. **Write unit tests alongside the code** (focus on services), testing each piece as you build it.

**Checkpoint (Week 3).** By the end of the first week of this block, aim to have at least **authentication, products, and SKUs (basic catalog) logic** implemented and unit-tested; progress will be evaluated at that checkpoint.

Before that checkpoint, run the review loop from [Working with Claude Code](https://ravn.getoutline.com/doc/working-with-claude-code-AaKqW1tQv8) over what you have built: fresh session, review the diff, fix, review again, then read the diff yourself. Come to the review session having already found your own obvious problems.

**Finish (Week 4).** By the end of the block, finish the API: authentication with roles and permissions, products, orders, and payments wired up end to end. Keep writing unit tests alongside the development process (focus on services).

Two additional deliverables come with the second half:

- **End-to-end tests** covering authentication, checkout, and order history. Write the authentication tests before you start changing the checkpoint's code, and write the checkout and order-history tests as those flows land rather than at the end of the block.
- **The one-page architecture write-up** from the System Design Review above, revised as your implementation changed what you'd actually do, and ready to defend by the end of the block.

:::info
[Challenge - T-Shirt Store API](https://ravn.getoutline.com/doc/challenge-t-shirt-store-api-juLmG5zYeg)

:::
