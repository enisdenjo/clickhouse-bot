export const env = {
  DEBUG: process.env.DEBUG,
  CLICKHOUSE_USERNAME: process.env.CLICKHOUSE_USERNAME,
  CLICKHOUSE_PASSWORD: process.env.CLICKHOUSE_PASSWORD,
  CLICKHOUSE_ORGANIZATION_ID: process.env.CLICKHOUSE_ORGANIZATION_ID,
  CLICKHOUSE_INSTANCE_ID: process.env.CLICKHOUSE_INSTANCE_ID,
};

export function isDebug() {
  return env.DEBUG === '1' || env.DEBUG === 'true' || env.DEBUG === 't';
}
