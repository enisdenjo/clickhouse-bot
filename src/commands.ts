import os from 'node:os';
import clickhouseApi from './clickhouse.api';
import { createClient, Mutable } from 'fets';
import { env } from './env';

const client = createClient<Mutable<typeof clickhouseApi>>({
  endpoint: 'https://api.clickhouse.cloud',
});

// TODO: createClient should have a headers option that are included in all requests
const headers = {
  Authorization:
    'Basic ' +
    Buffer.from(
      env.CLICKHOUSE_KEY_ID + ':' + env.CLICKHOUSE_KEY_SECRET,
    ).toString('base64'),
};

// clickhouseApi@components/schemas/Service
interface Instance {
  id: string;
  name: string;
  provider: 'aws' | 'gcp';
  region:
    | 'ap-south-1'
    | 'ap-southeast-1'
    | 'eu-central-1'
    | 'eu-west-1'
    | 'us-east-1'
    | 'us-east-2'
    | 'us-west-2'
    | 'us-east1'
    | 'us-central1'
    | 'europe-west4'
    | 'asia-southeast1';
  state:
    | 'starting'
    | 'stopping'
    | 'terminating'
    | 'provisioning'
    | 'running'
    | 'stopped'
    | 'terminated'
    | 'degraded'
    | 'failed'
    | 'idle';
  ipAccessList: { source: string; description: string }[];
  tier:
    | 'development'
    | 'production'
    | 'dedicated_high_mem'
    | 'dedicated_high_cpu'
    | 'dedicated_standard';
}

export async function getInstance(organizationId: string, instanceId: string) {
  const res = await client[
    '/v1/organizations/:organizationId/services/:serviceId'
  ].get({
    headers,
    params: {
      // @ts-expect-error TODO: wrongly inferred names "Organizaiton ID" and "Service ID"
      organizationId,
      serviceId: instanceId,
    },
  });

  const body = await res.json();
  if ('error' in body) {
    throw new Error(String(body.error));
  }
  if (!('result' in body)) {
    throw new Error('Result not present in the response body');
  }

  // TODO: not typed because openapi schema uses $ref
  return body.result as Instance;
}

export async function createInstanceFromLatestBackup(
  organizationId: string,
  instanceId: string,
) {
  console.debug('Getting the instance');
  const instance = await getInstance(organizationId, instanceId);

  console.debug('Finding backup to restore');
  const backups = await getBackups(organizationId, instanceId);

  // sort by dates in descending order
  backups.sort((a, b) =>
    new Date(a.finishedAt) < new Date(b.finishedAt) ? 1 : -1,
  );

  const backupId = backups[0]?.id;
  if (!backupId) {
    throw new Error('No backups found');
  }

  console.debug('Restoring backup', { backupId });
  const restored = await restoreBackup({
    organizationId,
    backupId,
    name: `[clickhouse-bot] restore (${Math.floor(Math.random() * 1000)})`,
    provider: instance.provider,
    region: instance.region,
    ipAccessList: [
      {
        source: await getRemoteIp(),
        description: `[clickhouse-bot] ${os.hostname()}`,
      },
    ],
    tier: instance.tier, // must be same as original tier
  });

  return restored;
}

export async function waitForInstanceProvisioned(
  organizationId: string,
  instanceId: string,
  pollTimeoutInMs: number,
) {
  console.debug('Waiting for instance to be provisioned');

  let instance = await getInstance(organizationId, instanceId);

  while (instance.state === 'provisioning') {
    console.debug(
      `Instance state is "${instance.state}", waiting ${pollTimeoutInMs}ms`,
    );
    await new Promise((resolve) => setTimeout(resolve, pollTimeoutInMs));
    instance = await getInstance(organizationId, instanceId);
  }

  return 'Ok';
}

export async function whitelistMyIpInInstance(
  organizationId: string,
  instanceId: string,
) {
  const ip = await getRemoteIp();
  const description = `[clickhouse-bot] ${os.hostname()}`;
  console.debug('Whitelisting IP', { ip, description });

  const res = await client[
    '/v1/organizations/:organizationId/services/:serviceId'
  ].patch({
    // @ts-expect-error headers is still allowed
    headers,
    // TODO: params not typed but are there
    params: {
      organizationId,
      serviceId: instanceId,
    },
    json: {
      ipAccessList: {
        add: [
          {
            source: ip,
            description,
          },
        ],
      },
    },
  });

  const body = await res.json();
  if ('error' in body) {
    throw new Error(String(body.error));
  }
  if (!('result' in body)) {
    throw new Error('Result not present in the response body');
  }

  // TODO: not typed because openapi schema uses $ref
  return body.result as Instance;
}

export async function removeMyIpFromWhitelistInInstance(
  organizationId: string,
  instanceId: string,
) {
  const ip = await getRemoteIp();
  const description = `[clickhouse-bot] ${os.hostname()}`;
  console.debug('Removing whitelisted IP', { ip, description });

  const res = await client[
    '/v1/organizations/:organizationId/services/:serviceId'
  ].patch({
    // @ts-expect-error headers is still allowed
    headers,
    // TODO: params not typed but are there
    params: {
      organizationId,
      serviceId: instanceId,
    },
    json: {
      ipAccessList: {
        remove: [
          {
            source: ip,
            description,
          },
        ],
      },
    },
  });

  const body = await res.json();
  if ('error' in body) {
    throw new Error(String(body.error));
  }
  if (!('result' in body)) {
    throw new Error('Result not present in the response body');
  }

  // TODO: not typed because openapi schema uses $ref
  return body.result as Instance;
}

// clickhouseApi@components/schemas/Backup
interface Backup {
  id: string;
  status: 'done' | 'error' | 'in_progress';
  finishedAt: string;
}

async function getBackups(organizationId: string, instanceId: string) {
  const res = await client[
    '/v1/organizations/:organizationId/services/:serviceId/backups'
  ].get({
    headers,
    params: {
      // @ts-expect-error TODO: openapi schema uses "Organizaiton ID" and "Service ID" names
      organizationId,
      serviceId: instanceId,
    },
  });
  const body = await res.json();
  if ('error' in body) {
    throw new Error(String(body.error));
  }
  if (!('result' in body)) {
    throw new Error('Result not present in the response body');
  }
  // TODO: not typed because openapi schema uses $ref
  return body.result as Backup[];
}

async function restoreBackup({
  organizationId,
  backupId,
  name,
  provider,
  region,
  ipAccessList,
  tier,
}: {
  organizationId: string;
  backupId: string;
  name: string;
  provider: Instance['provider'];
  region: Instance['region'];
  ipAccessList: Instance['ipAccessList'];
  tier: Instance['tier'];
}) {
  const res = await client['/v1/organizations/:organizationId/services'].post({
    // @ts-expect-error headers is still allowed
    headers,
    // TODO: params not typed but are there
    params: {
      organizationId,
    },
    json: {
      backupId,
      name,
      provider,
      region,
      ipAccessList,
      tier,
    },
  });
  const body = await res.json();
  if ('error' in body) {
    throw new Error(String(body.error));
  }
  if (!('result' in body)) {
    throw new Error('Result not present in the response body');
  }
  // TODO: not typed because openapi schema uses $ref
  return body.result as { service: Instance; password: string };
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
