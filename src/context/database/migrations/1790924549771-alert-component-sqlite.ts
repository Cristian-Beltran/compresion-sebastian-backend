import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlertComponentSqlite1790924549771 implements MigrationInterface {
  name = 'AlertComponentSqlite1790924549771';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "alerts" ADD COLUMN "component" text');
  }

  async down(): Promise<void> {
    // SQLite rollback retains the optional column for compatibility.
  }
}
