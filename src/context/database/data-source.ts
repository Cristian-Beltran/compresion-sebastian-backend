import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as path from 'path';

const SQLITE_PATH = process.env.SQLITE_PATH ?? 'data/sebastian.sqlite';

export default new DataSource({
  type: 'sqlite',
  database: path.resolve(process.cwd(), SQLITE_PATH),
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  entities: [
    path.resolve(__dirname, '..', '..', 'app', '**', '*.entity.{ts,js}'),
  ],
  migrations: [path.resolve(__dirname, 'migrations', '*-sqlite.{ts,js}')],
  migrationsTableName: 'migrations',
});
