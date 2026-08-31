const DEFAULT_REDIS_HOST = 'localhost';
const DEFAULT_REDIS_PORT = 6379;

export function getRedisConnectionOptions(): { host: string; port: number } {
  const port = Number(process.env.REDIS_PORT);

  return {
    host: process.env.REDIS_HOST ?? DEFAULT_REDIS_HOST,
    port: Number.isFinite(port) && port > 0 ? port : DEFAULT_REDIS_PORT,
  };
}
