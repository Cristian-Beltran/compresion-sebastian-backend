import { MigrationInterface, QueryRunner } from 'typeorm';

export class PatientMobilityAndDoctorProfileSqlite1790924549772
  implements MigrationInterface
{
  name = 'PatientMobilityAndDoctorProfileSqlite1790924549772';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "patients" ADD COLUMN "mobilityLevel" varchar(30)');
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN "customTherapyProfile" text');
  }

  async down(): Promise<void> {
    // SQLite keeps optional columns for backward-compatible rollback.
  }
}
