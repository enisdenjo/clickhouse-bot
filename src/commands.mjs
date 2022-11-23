import os from 'os';
import * as ch from './clickhouse.mjs';
import { isTrue } from './utils.mjs';

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
 * @param {string} token
 * @param {string} organizationId
 * @param {string} instanceId
 */
export async function getInstance(token, organizationId, instanceId) {
  return await ch.getInstance({ token, organizationId, instanceId });
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
 */
export async function waitForInstanceProvisioned(
  token,
  organizationId,
  instanceId,
) {
  console.debug('Waiting for instance to be provisioned');

  let instance = await ch.getInstance({ token, organizationId, instanceId });

  while (instance.state === 'provisioning') {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.debug('Checking instance state');
    instance = await ch.getInstance({ token, organizationId, instanceId });
  }
}
/**
 * @param {string} token
 * @param {string} organizationId
 * @param {string} instanceId
 */
export async function createInstanceFromLatestBackup(
  token,
  organizationId,
  instanceId,
) {
  console.debug('Finding backup to restore');
  const backups = await ch.getBackups({ token, organizationId, instanceId });

  // TODO: make sure we're using the latest backup

  const backupId = backups[0]?.id;
  if (!backupId) {
    throw new Error('No backups found');
  }

  console.debug('Restoring backup', { backupId });
  const restoredInstanceId = await ch.restoreBackup({
    token,
    organizationId,
    instanceId,
    backupId,
    restoredInstanceName: `[clickhouse-bot] restore (${Math.floor(
      Math.random() * 1000,
    )})`,
  });

  return await ch.getInstance({
    token,
    organizationId,
    instanceId: restoredInstanceId,
  });
}

/**
 * @param {string} token
 * @param {string} organizationId
 * @param {string} instanceId
 */
export async function whitelistMyIpInInstance(
  token,
  organizationId,
  instanceId,
) {
  const ip = await getRemoteIp();
  const description = `[clickhouse-bot] ${os.hostname()}`;
  console.debug('Whitelisting IP', { ip, description });

  const instance = await ch.getInstance({ token, organizationId, instanceId });

  await ch.updateInstanceIpAccessList({
    token,
    organizationId,
    instanceId,
    ipAccessList: [...instance.ipAccessList, { source: ip, description }],
  });
}

/**
 * @param {string} token
 * @param {string} organizationId
 * @param {string} instanceId
 */
export async function removeMyIpFromWhitelistInInstance(
  token,
  organizationId,
  instanceId,
) {
  const ip = await getRemoteIp();
  console.debug('Removing IP from whitelist', { ip });

  const instance = await ch.getInstance({ token, organizationId, instanceId });

  await ch.updateInstanceIpAccessList({
    token,
    organizationId,
    instanceId,
    ipAccessList: instance.ipAccessList.filter(({ source }) => source !== ip),
  });
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

/**
 * @param {string} token
 * @param {string} organizationId
 * @param {string} instanceId
 */
export async function deleteInstance(token, organizationId, instanceId) {
  console.debug('Deleting instance');
  return await ch.deleteInstance({
    token,
    organizationId,
    instanceId,
  });
}

async function getRemoteIp() {
  const res = await fetch('http://ifconfig.me/ip');
  if (!res.ok) {
    throw new Error(
      `Remote IP request failed with ${res.status}: ${res.statusText}`,
    );
  }
  return res.text();
}
