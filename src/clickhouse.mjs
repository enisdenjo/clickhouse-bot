import pptr from 'puppeteer';
import { env } from './env.mjs';

/**
 * @param {string} username
 * @param {string} password
 * @return {Promise<string>} The JWT access token acquired after logging it.
 */
export async function login(username, password) {
  console.debug('Logging in to ClickHouse', { username });

  const browser = await pptr.launch({
    headless: !env.isDev,
    devtools: env.isDev,
  });
  const page = await browser.newPage();

  await page.goto('https://clickhouse.cloud/signin');

  await page.type('input[name=email]', username);
  await page.type('input[name=password]', password);
  await page.click('button[type=submit]');

  let accessToken = '';

  // there will be multiple AWS Cognito requests, one of them must have the access token
  while (!accessToken) {
    const res = await page.waitForResponse(
      'https://cognito-idp.us-east-2.amazonaws.com/',
    );

    if (res.headers()['content-type'] === 'application/x-amz-json-1.1') {
      const body = await res.json();
      const tentativeAccessToken = body.AuthenticationResult?.AccessToken;
      if (typeof tentativeAccessToken === 'string') {
        accessToken = tentativeAccessToken;
      }
    }
  }

  await browser.close();

  return accessToken;
}

/**
 * @typedef {{ source: string, description: string }[]} IpAccessList
 *
 * @typedef {{
 *   id: string
 *   name: string
 *   state: 'running' | 'provisioning' | 'terminating' | 'failed'
 *   dbUsername: string
 *   endpoints: {
 *     nativesecure: { hostname: string, port: number }
 *     https: { hostname: string, port: number }
 *   }
 *   ipAccessList: IpAccessList
 * }} Instance
 */

/**
 * @param {{ token: string, organizationId: string }} opts
 */
export async function getInstances({ token, organizationId }) {
  console.debug('Retrieving instances', { organizationId });

  /**
   * @type {{ instances: Instance[] }}
   */
  const res = await request({
    endpoint: 'instance',
    token,
    body: {
      rpcAction: 'list',
      organizationId,
    },
  });

  return res.instances;
}

/**
 * @param {{ token: string, organizationId: string, instanceId: string }} opts
 */
export async function getInstance({ token, organizationId, instanceId }) {
  console.debug('Retrieving instance', { organizationId, instanceId });

  /**
   * @type {{ instance: Instance }}
   */
  const res = await request({
    endpoint: 'instance',
    token,
    body: {
      rpcAction: 'updateUserDataFlag', // TODO: is this really the right action? (is in UI)
      instanceId,
      organizationId,
    },
  });

  return res.instance;
}

/**
 * @param {{ token: string, organizationId: string, instanceId: string, ipAccessList: IpAccessList }} opts
 */
export async function updateInstanceIpAccessList({
  token,
  organizationId,
  instanceId,
  ipAccessList,
}) {
  console.debug('Updating instance ip access list', {
    organizationId,
    instanceId,
  });

  await request({
    endpoint: 'instance',
    token,
    body: {
      rpcAction: 'updateIpAccessList',
      organizationId,
      instanceId,
      ipAccessList,
    },
  });
}

/**
 * @param {{ token: string, organizationId: string, instanceId: string }} opts
 */
export async function deleteInstance({ token, organizationId, instanceId }) {
  console.debug('Deleting instance', { organizationId, instanceId });

  if (env.clickhouse.instanceId === instanceId) {
    // NEVER EVER DELETE ORIGINAL INSTANCE
    throw new Error('Deleting original instance is disallowed!');
  }

  /** @type {{ instanceId: string }} */
  await request({
    endpoint: 'instance',
    token,
    body: {
      rpcAction: 'delete',
      organizationId,
      instanceId,
    },
  });
}

/**
 * @param {{ token: string, organizationId: string, instanceId: string }} opts
 */
export async function getBackups({ token, organizationId, instanceId }) {
  console.debug('Retrieving backups', { organizationId, instanceId });

  /** @type {{ backups: { id: string, createdAt: number }[] }} */
  const res = await request({
    endpoint: 'backup',
    token,
    body: {
      rpcAction: 'list',
      organizationId,
      instanceId,
    },
  });

  return res.backups;
}

/**
 * @param {{ token: string, organizationId: string, instanceId: string, backupId: string, restoredInstanceName: string }} opts
 */
export async function restoreBackup({
  token,
  organizationId,
  instanceId,
  backupId,
  restoredInstanceName,
}) {
  console.debug('Restoring backup', {
    organizationId,
    instanceId,
    backupId,
    restoredInstanceName,
  });

  /** @type {{ instanceId: string }} */
  const res = await request({
    endpoint: 'backup',
    token,
    body: {
      rpcAction: 'restore',
      organizationId,
      instanceId,
      backupId,
      instanceName: restoredInstanceName,
    },
  });

  return res.instanceId;
}

/**
 * @param {{ endpoint: 'instance' | 'backup', token: string, body: Record<string, unknown> }} opts
 */
async function request({ endpoint, token, body }) {
  const url = `https://clickhouse.cloud/api/${endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.debug('Request failed', {
      url,
      body,
      status: res.status,
      statusText: res.statusText,
      response: await res.text(),
    });
    throw new Error(`Request failed with ${res.status}: ${res.statusText}`);
  }
  if (!res.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Response content-type is not application/json');
  }
  return res.json();
}
