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

export async function getInstance(organizationId: string, instanceId: string) {
  const service = await client[
    '/v1/organizations/:organizationId/services/:serviceId'
  ].get({
    headers,
    params: {
      // @ts-expect-error TODO: wrongly inferred names "Organizaiton ID" and "Service ID"
      organizationId,
      serviceId: instanceId,
    },
  });

  const body = await service.json();
  if ('error' in body) {
    throw new Error(body.error);
  }
  if (!('result' in body)) {
    throw new Error('Result not present in the response body');
  }

  // TODO: service result is not typed (openapi references schema with $ref)
  return body.result;
}

export async function createInstanceFromLatestBackup