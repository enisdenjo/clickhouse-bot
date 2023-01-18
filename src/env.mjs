import { isTrue } from './utils.mjs';

export const env = {
  DEBUG: process.env.DEBUG,
  PUPPETEER_OPEN_BROWSER: isTrue(process.env.PUPPETEER_OPEN_BROWSER),
  CLICKHOUSE_PROTECTED_INSTANCE_ID:
    process.env.CLICKHOUSE_PROTECTED_INSTANCE_ID,
};

export function isDebug() {
  return isTrue(env.DEBUG);
}
