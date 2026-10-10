# Weekly Summary: Oct 7 – Oct 9, 2026

This summary covers only the commits made Oct 7–9 (PRs #53–#65, plus the Oct 7–8 commits of #51). The main feature is **image storage on AWS S3**. A good share of the work also went into tooling for Claude agents.

The test suite went from **510 tests (78 suites)** to **827 tests (103 suites)**.

---

## 1. Image storage on S3

### Groundwork (PRs #53, #55, #56)

- Dependencies: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `sharp`, `@types/multer`.
- New env vars in `.env.example`:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION`
  - `AWS_S3_BUCKET`
  - `AWS_S3_SIGNED_URL_TTL` (default 3600s)
- The bucket is **private**. Clients always get **presigned GET URLs**.

### New `src/storage/` module (PR #59)

This is a shared module that other domains use. It has a flat layout, like `src/mail/`.

- `FileStorageService` port, implemented by `S3FileStorageService`. The S3 client is injected through the `S3_CLIENT` factory token.
- `ImageProcessorService` port, implemented by `SharpImageProcessorService`. It handles format and dimension detection from the file bytes, resizing, and normalization.

### User avatars

- **`PATCH /users/avatar`** (PR #59): authenticated users upload their own avatar (multipart field `image`).
  - Validation: PNG/JPEG detected from the bytes, ≤ 2 MB, 1:1 ratio, between 512×512 and 1024×1024.
  - The image is resized to a 512×512 JPEG and stored at `avatars/<userId>/<uuid>.jpg`.
  - Upload order: the new object is uploaded, then saved to the DB, then the old object is deleted (best-effort). If saving fails, the new object is removed.
- **`GET /users/:id/avatar`** (PR #60): **public**.
  - Returns a presigned URL for the user's avatar.
  - If the user has no avatar, it returns `/static/avatar_default.png` with `isDefault: true`.
  - `main.ts` now serves the root `static/` folder at `/static`.

### Product images

- **`POST /products/:id/images`** (PR #61): manager only.
  - Accepts 1–10 files per request and at most 10 images per product.
  - Each file must be PNG/JPEG, ≤ 5 MB and at most 1024 px on each side.
  - Every file is checked before anything is uploaded. If something fails partway, the files already uploaded are deleted.
  - Images keep their format, get EXIF rotation applied and have their metadata stripped. They are stored at `products/<productId>/<uuid>.<ext>`.
- **All four product GETs** now include `images: [{ id, url, expiresIn, isDefault, variantId }]`.
  - Images for a whole page of products load in one query.
  - A product with no images gets a default `static/product_default.png` entry.
- **`DELETE /products/images/:imageId`** (PR #62): manager only.
  - Soft-deletes the image row, then deletes the S3 object (best-effort).
  - Returns the product's remaining images.
  - Adds `ProductImageUrlsService`, which builds the presigned image list and is shared by the upload, delete and get-by-id use-cases.
- **Linking images to variants** (PR #63):
  - `PUT /products/images/:imageId/variant/:variantId` links an image to a variant. Linking the same pair again does nothing. If the image is already linked to a different variant, it returns 409. If the variant belongs to another product, it returns 400.
  - `DELETE /products/images/:imageId/variant` unlinks the image.
  - Every image item now includes `variantId`.
  - `ProductsModule` registers its own binding for `ProductVariantRepository` to avoid a circular module import.
- **Variant GETs include images** (PR #64):
  - The active, liked and disabled variant listings now return each variant's linked images, loaded for the whole page in one query.
  - A new shared `ProductImageResponseMapper` is used by both the products and product-variants response mappers.

## 2. Developer tooling & Claude configuration

- **Skills** (Oct 7–8 commits of PR #51, and PR #54):
  - `/commit` no longer pushes the branch, and it now checks the current branch before committing.
  - The `do-work` skill was replaced by `verify-and-commit`. Its lint and test gate now runs from a script (`scripts/verify.sh`).
  - `add-endpoint` gained a delegation contract and an opt-in `reviewed` trial mode, which uses the new `implementer` and `reviewer` agents.
  - New skills: `add-service` and `add-repository`.
  - Docs: the PRD for issue 52 (`plans/issue-52-ai-module-skills-review.md`) and the AI module write-up (`docs/ai-module/`).
- **Faster pre-commit for docs-only commits** (PR #57):
  - `.husky/lib/non-code-only.sh` skips lint and tests when every staged file is docs or config.
  - A docs-only commit now takes 0.26s instead of about 50s.
- **Read-only DB query tool** (PR #58):
  - `.claude/tools/db-query/` plus the `query-db` skill.
  - Read-only access is enforced in two places: the tool's own SQL check and a read-only Postgres session.
  - The `db-readonly-guard` hook blocks direct `psql` and `docker exec` writes.
- **Dotenv guard** (PR #65): the `env-file-guard` hook stops agents from reading `.env` files. They are pointed to `.env.example` instead.

---

## Known follow-ups / limitations

These were noted in the PR descriptions.

- **Product image order:** images uploaded in the same request share a `createdAt`. A `position` column (which needs a migration) would keep upload order.
- **Image limit race:** two uploads to the same product at the same time could together go over the 10-image limit.
- **Default image URL:** the URL for default images is built from the request's `Host` header. An `APP_URL` override is a possible improvement.
- **`start:prod` path:** `start:prod` points to `dist/main`, but the build outputs `dist/src/main.js`. This was already the case before this week.
- **Failure after avatar replace:** if presigning fails after the avatar has been replaced, the client gets a 500 even though the change went through.
- **AWS permissions:** the AWS IAM user needs `s3:PutObject`, `s3:GetObject` and `s3:DeleteObject` on the bucket.
- **Hook false positives:** the `db-readonly-guard` and `env-file-guard` hooks match on patterns, so they can block harmless commands.
