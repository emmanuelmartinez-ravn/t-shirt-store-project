const DEFAULT_FRONTEND_URL = 'frontend.com';

export function buildActivationLink(token: string): string {
  const frontendUrl = process.env.FRONTEND_URL ?? DEFAULT_FRONTEND_URL;

  return `${frontendUrl}/activation/${token}`;
}
