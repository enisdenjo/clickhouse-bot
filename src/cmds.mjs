import { executeTestQueries } from './clickhouse.mjs';

/**
 * @param {string} url
 * @param {string} username
 * @param {string} password
 */
export async function runTestQueries(url, username, password) {
  return await executeTestQueries({ url, username, password });
}

/**
 * @param {string} url0
 * @param {string} username0
 * @param {string} password0
 * @param {string} url1
 * @param {string} username1
 * @param {string} password1
 */
export async function compareTestQueries(
  url0,
  username0,
  password0,
  url1,
  username1,
  password1,
) {
  console.debug('Comparing test queries between two databases', { url0, url1 });

  const [res0, res1] = await Promise.all([
    executeTestQueries({
      url: url0,
      username: username0,
      password: password0,
    }),
    executeTestQueries({
      url: url1,
      username: username1,
      password: password1,
    }),
  ]);

  for (const [key, val0] of Object.entries(res0)) {
    // @ts-expect-error
    const val1 = res1[key];
    if (val0 !== val1) {
      throw new Error(
        `Value for "${key}" is not the same, url0 "${val0}" vs url1 "${val1}"`,
      );
    }
  }

  return 'Ok';
}
