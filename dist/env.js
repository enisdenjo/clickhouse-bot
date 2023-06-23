import { z } from 'zod';
export const env = z
    .object({
    DEBUG: z
        .string()
        .default('0')
        .transform((arg) => ['1', 'y', 'yes', 't', 'true'].includes(arg)),
    CLICKHOUSE_KEY_ID: z.string(),
    CLICKHOUSE_KEY_SECRET: z.string(),
    CLICKHOUSE_PROTECTED_INSTANCE_ID: z
        .string()
        // so that the env var appears in the help command
        .default(''),
})
    .parse(process.env);
if (!env.DEBUG) {
    console.debug = () => {
        // noop
    };
}
