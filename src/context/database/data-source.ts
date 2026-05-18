import { DataSource } from 'typeorm';
import * as path from 'path';

const SQLITE_PATH = 'data/app.db';

export default new DataSource({
  type: 'sqlite',
  database: path.resolve(process.cwd(), SQLITE_PATH),
  synchronize: false,
  logging: true,
  entities: [
    path.resolve(__dirname, '..', '..', 'app', '**', '*.entity.{ts,js}'),
  ],
  migrations: [path.resolve(__dirname, 'migrations', '*{.ts,.js}')],
  migrationsTableName: 'migrations',
});
