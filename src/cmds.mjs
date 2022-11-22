import * as ch from './clickhouse.mjs';

/**
 * @param {string} url
 * @param {string} username
 * @param {string} password
 */
export async function runTestQueries(url, username, password) {
  return await ch.executeTestQueries({ url, username, password });
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
    ch.executeTestQueries({
      url: url0,
      username: username0,
      password: password0,
    }),
    ch.executeTestQueries({
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

/**
 * @param {string} username
 * @param {string} password
 */
export async function getToken(username, password) {
  return await ch.getToken(username, password);
}

/**
 * @param {string} token
 * @param {string} organizationId
 * @param {string} instanceId
 * @param {boolean=} waitForProvisioned
 */
export async function createInstanceFromLatestBackup(
  token,
  organizationId,
  instanceId,
  waitForProvisioned,
) {
  console.debug('Finding backup to restore');
  const backups = await ch.getBackups({ token, organizationId, instanceId });

  // TODO: make sure we're using the latest backup

  const backupId = backups[0]?.id;
  if (!backupId) {
    throw new Error('No backups found');
  }

  console.debug('Initiating backup restore', { backupId });
  const restoredInstanceId = await ch.restoreBackup({
    token,
    organizationId,
    instanceId,
    backupId,
    restoredInstanceName: `[clickhouse-bot] restore (${Math.floor(
      Math.random() * 1000,
    )})`,
  });

  let restoredInstance = await ch.getInstance({
    token,
    organizationId,
    instanceId: restoredInstanceId,
  });

  if (!waitForProvisioned) {
    console.debug('Skip waiting for restored instance to be provisioned');
    return restoredInstance;
  }

  console.debug('Waiting for restored instance to be provisioned');
  let checks = 0;
  while (restoredInstance.state === 'provisioning') {
    console.debug('Checking instance state');
    if (checks >= 132) {
      throw new Error(
        `Instance ${restoredInstanceId} from ${organizationId} was never provisioned`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
    restoredInstance = await ch.getInstance({
      token,
      organizationId,
      instanceId: restoredInstanceId,
    });
    checks++;
  }
}

/**
 * @param {string} token
 * @param {string} organizationId
 * @param {string} instanceId
 */
export async function resetInstancePassword(token, organizationId, instanceId) {
  console.debug('Resetting instance password');
  return await ch.restoreInstancePassword({
    token,
    organizationId,
    instanceId,
  });
}
