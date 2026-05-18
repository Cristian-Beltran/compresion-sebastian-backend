import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import config from 'src/context/shared/config';
import { ConfigType } from '@nestjs/config';
import { MigrationController } from './database.controller';
import * as path from 'path';
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [config.KEY],
      useFactory: (configService: ConfigType<typeof config>) => {
        const dbPath = path.resolve(process.cwd(), configService.database.sqlitePath);
        return {
          type: 'sqlite',
          database: dbPath,
          autoLoadEntities: true,
          synchronize: true,
        };
      },
    }),
  ],
  controllers: [MigrationController],
})
export class DatabaseModule {}
