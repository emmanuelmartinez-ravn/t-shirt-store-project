const DEFAULT_ACCOUNT_ACTIVATION_TOKEN_TTL_MINUTES = 30;

export function getAccountActivationTokenTtlMinutes(): number {
  const configured = Number(process.env.ACCOUNT_ACTIVATION_TOKEN_TTL);

  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_ACCOUNT_ACTIVATION_TOKEN_TTL_MINUTES;
}
