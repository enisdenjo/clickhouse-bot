import { isTrue } from './utils.mjs';

export const env = {
  DEBUG: process.env.DEBUG,
  CLICKHOUSE_PROTECTED_INSTANCE_ID:
    process.env.CLICKHOUSE_PROTECTED_INSTANCE_ID,
};

export function isDebug() {
  return isTrue(env.DEBUG);
}
