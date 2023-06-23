//@ts-nocheck
import { createClient } from 'fets';
import { env } from './env';
/** use client */
const client = createClient({
    endpoint: 'https://api.clickhouse.cloud',
});
const service = await client['/v1/organizations/:organizationId/services/:serviceId'].get({
    headers: {
        Authorization: 'Basic ' +
            Buffer.from(env.keyId + ':' + env.keySecret).toString('base64'),
    },
    params: {
        // @ts-expect-error TODO: wrongly inferred names "Organizaiton ID" and "Service ID"
        organizationId: env.organizationId,
        serviceId: env.serviceId,
    },
});
// TODO: service is not typed (openapi references schema with $ref)
console.log({ service });
