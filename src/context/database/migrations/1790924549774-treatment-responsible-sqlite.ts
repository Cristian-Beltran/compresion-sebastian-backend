import { MigrationInterface, QueryRunner } from 'typeorm';

export class TreatmentResponsibleSqlite1790924549774 implements MigrationInterface {
  name = 'TreatmentResponsibleSqlite1790924549774';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "treatments" ADD COLUMN "responsibleUserId" varchar(36)');
    await queryRunner.query('ALTER TABLE "treatments" ADD COLUMN "responsibleName" varchar(160)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite does not support dropping columns in place; keeping the data is safer.
  }
}
