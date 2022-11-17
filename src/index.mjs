import { env } from './env.mjs';
import {
  login,
  deleteInstance,
  getBackups,
  restoreBackup,
  getInstance,
  updateInstanceIpAccessList,
  restoreInstancePassword,
} from './clickhouse.mjs';

(async () => {
  const username = env.clickhouse.username || '';
  console.info('Logging into ClickHouse', { username });
  const token = await login(username, env.clickhouse.password || '');
  console.debug('Access token acquired', { token });

  const organizationId = env.clickhouse.organizationId || '';
  const instanceId = env.clickhouse.instanceId || '';

  console.info('Finding backup to restore');
  const backups = await getBackups({ token, organizationId, instanceId });

  // TODO: make sure we're using the latest backup

  const backupId = backups[0]?.id;
  if (!backupId) {
    throw new Error('No backups found');
  }

  console.info('Initiating backup restore', { backupId });
  const restoredInstanceId = await restoreBackup({
    token,
    organizationId,
    instanceId,
    backupId,
    restoredInstanceName: `[clickhouse-bot] restore (${Math.floor(
      Math.random() * 1000,
    )})`,
  });

  let restoredInstance = await getInstance({
    token,
    organizationId,
    instanceId: restoredInstanceId,
  });

  console.info('Waiting for restored instance to be provisioned');
  let checks = 0;
  while (restoredInstance.state === 'provisioning') {
    console.debug('Checking instance state');
    if (checks >= 132) {
      throw new Error(
        `Instance ${restoredInstanceId} from ${organizationId} was never provisioned`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
    restoredInstance = await getInstance({
      token,
      organizationId,
      instanceId: restoredInstanceId,
    });
    checks++;
  }

  const ip = await getRemoteIp();
  const ipDescription = '[clickhouse-bot]';
  console.log('Whitelisting IP', { ip, ipDescription });
  await updateInstanceIpAccessList({
    token,
    organizationId,
    instanceId,
    ipAccessList: [
      ...restoredInstance.ipAccessList,
      { source: ip, description: ipDescription },
    ],
  });

  console.log('Resetting password');
  const password = await restoreInstancePassword({
    token,
    organizationId,
    instanceId: restoredInstanceId,
  });
  console.log('New password acquired', { password });

  // TODO: test queries

  console.info('Deleting restored instance');
  await deleteInstance({
    token,
    organizationId,
    instanceId: restoredInstanceId,
  });
})();

async function getRemoteIp() {
  const res = await fetch('http://ifconfig.me/ip');
  if (!res.ok) {
    throw new Error(
      `Remote IP request failed with ${res.status}: ${res.statusText}`,
    );
  }
  return res.text();
}
