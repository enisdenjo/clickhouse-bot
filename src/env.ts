import { z } from 'zod';

export const env = z
  .object({
    CLICKHOUSE_KEY_ID: z.string(),
    CLICKHOUSE_KEY_SECRET: z.string(),
    CLICKHOUSE_ORGANIZATION_ID: z.string(),
    CLICKHOUSE_INSTANCE_ID: z.string(),
  })
  .parse(process.env);
