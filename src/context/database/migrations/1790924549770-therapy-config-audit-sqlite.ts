import { MigrationInterface, QueryRunner } from 'typeorm';

export class TherapyConfigAuditSqlite1790924549770
  implements MigrationInterface
{
  name = 'TherapyConfigAuditSqlite1790924549770';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "therapy_configs" ADD COLUMN "lastEditedBy" text',
    );
    await queryRunner.query(
      'ALTER TABLE "therapy_configs" ADD COLUMN "lastEditedAt" datetime',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite cannot drop columns safely on every supported version. The audit
    // fields are intentionally retained if a rollback is requested.
  }
}
