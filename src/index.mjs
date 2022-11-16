import { login } from './login.mjs';

export const isDev = process.env.NODE_ENV !== 'production';

(async () => {
  const token = await login(
    process.env.CLICKHOUSE_USERNAME || '',
    process.env.CLICKHOUSE_PASSWORD || '',
  );

  console.debug('Logged into ClickHouse', { token });
})();
