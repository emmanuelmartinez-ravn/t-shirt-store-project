const DEFAULT_SIGNED_URL_TTL_SECONDS = 3600;

export function getSignedUrlTtlSeconds(): number {
  const configured = Number(process.env.AWS_S3_SIGNED_URL_TTL);

  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_SIGNED_URL_TTL_SECONDS;
}
