import { env } from './env.mjs';
import {
  login,
  deleteInstance,
  getBackups,
  restoreBackup,
  getInstance,
} from './clickhouse.mjs';

(async () => {
  const token = await login(
    env.clickhouse.username || '',
    env.clickhouse.password || '',
  );

  console.debug('Access token acquired', { token });

  const organizationId = env.clickhouse.organizationId || '';
  const instanceId = env.clickhouse.instanceId || '';

  const backups = await getBackups({ token, organizationId, instanceId });

  // TODO: make sure we're using the latest backup

  const backupId = backups[0]?.id;
  if (!backupId) {
    throw new Error('No backups found');
  }

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

  console.debug('Waiting for restored instance to be provisioned...', {
    organizationId,
    instanceId,
  });

  let pings = 0;
  while (restoredInstance.state === 'provisioning') {
    if (pings >= 100) {
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
    pings++;
  }

  // TODO: reset password, whitelist IP and test queries

  await deleteInstance({
    token,
    organizationId,
    instanceId: restoredInstanceId,
  });
})();
