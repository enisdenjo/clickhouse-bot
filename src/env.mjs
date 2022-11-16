export const env = {
  isDev: process.env.NODE_ENV !== 'production',
  clickhouse: {
    username: process.env.CLICKHOUSE_USERNAME,
    password: process.env.CLICKHOUSE_PASSWORD,
    organizationId: process.env.CLICKHOUSE_ORGANIZATION_ID,
    instanceId: process.env.CLICKHOUSE_INSTANCE_ID,
  },
};
