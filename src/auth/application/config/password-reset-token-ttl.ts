const DEFAULT_PASSWORD_RESET_TOKEN_TTL_MINUTES = 30;

export function getPasswordResetTokenTtlMinutes(): number {
  const configured = Number(process.env.PASSWORD_RESET_TOKEN_TTL);

  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_PASSWORD_RESET_TOKEN_TTL_MINUTES;
}
