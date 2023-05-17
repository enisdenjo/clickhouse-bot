import clickhouseApi from './clickhouse.api';
import { createClient, Mutable } from 'fets';

const env = {
  organizationId: String(process.env.CLICKHOUSE_ORGANIZATION_ID),
  serviceId: String(process.env.CLICKHOUSE_INSTANCE_ID),
};

const client = createClient<Mutable<typeof clickhouseApi>>({
  endpoint: 'https://api.clickhouse.cloud',
});

(async () => {
  // TODO: if the request fails, some handler gets stuck and node doesnt exit
  const service = await client[
    '/v1/organizations/:organizationId/services/:serviceId'
  ].get({
    params: {
      // @ts-expect-error TODO: wrongly inferred names "Organizaiton ID" and "Service ID"
      organizationId: env.organizationId,
      serviceId: env.serviceId,
    },
  });
  console.log({ service });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
