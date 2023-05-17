import clickhouseApi from './clickhouse.api';
import { createClient, Mutable } from 'fets';

createClient<Mutable<typeof clickhouseApi>>();
