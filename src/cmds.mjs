import { query } from './clickhouse.mjs';

/**
 * @param {string} url
 * @param {string} username
 * @param {string} password
 */
export async function runTestQueries(url, username, password) {
  const ctx = { url, username, password };

  const operationCollection = await query({
    ...ctx,
    query: `
      SELECT sum(total) as total
      FROM operation_collection
      WHERE
        timestamp > subtractDays(toStartOfDay(yesterday()), 14)
        AND
        timestamp < toStartOfDay(yesterday())
    `,
  });

  const operations = await query({
    ...ctx,
    query: `
      SELECT count() as total
      FROM operations
      WHERE
        timestamp > subtractDays(toStartOfDay(yesterday()), 14)
        AND
        timestamp < toStartOfDay(yesterday())
    `,
  });

  const operationsHourly = await query({
    ...ctx,
    query: `
      SELECT sum(total) as total
      FROM operations_hourly
      WHERE
        timestamp > subtractDays(toStartOfDay(yesterday()), 14)
        AND
        timestamp < toStartOfDay(yesterday())
    `,
  });

  const operationsDaily = await query({
    ...ctx,
    query: `
      SELECT sum(total) as total
      FROM operations_daily
      WHERE
        timestamp > subtractDays(toStartOfDay(yesterday()), 14)
        AND
        timestamp < toStartOfDay(yesterday())
    `,
  });

  const coordinatesDaily = await query({
    ...ctx,
    query: `
      SELECT sum(total) as total
      FROM coordinates_daily
      WHERE
        timestamp > subtractDays(toStartOfDay(yesterday()), 14)
        AND
        timestamp < toStartOfDay(yesterday())
    `,
  });

  const clientsDaily = await query({
    ...ctx,
    query: `
      SELECT sum(total) as total
      FROM clients_daily
      WHERE
        timestamp > subtractDays(toStartOfDay(yesterday()), 14)
        AND
        timestamp < toStartOfDay(yesterday())
    `,
  });

  return {
    operationCollection,
    operations,
    operationsHourly,
    operationsDaily,
    coordinatesDaily,
    clientsDaily,
  };
}
