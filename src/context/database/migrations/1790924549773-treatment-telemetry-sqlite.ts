import { MigrationInterface, QueryRunner } from 'typeorm';

export class TreatmentTelemetrySqlite1790924549773 implements MigrationInterface {
  name = 'TreatmentTelemetrySqlite1790924549773';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "treatments" ADD COLUMN "clinicalRecordStatus" varchar(20) NOT NULL DEFAULT (\'pending\')');
    await queryRunner.query(`CREATE TABLE "treatment_telemetry" (
      "id" varchar PRIMARY KEY NOT NULL,
      "treatmentId" varchar(36) NOT NULL,
      "groupId" integer NOT NULL,
      "pressureKpa" float NOT NULL,
      "forceNewtons" float NOT NULL,
      "recordedAt" datetime NOT NULL DEFAULT (datetime('now'))
    )`);
    await queryRunner.query('CREATE INDEX "IDX_treatment_telemetry_treatment_time" ON "treatment_telemetry" ("treatmentId", "recordedAt")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_treatment_telemetry_treatment_time"');
    await queryRunner.query('DROP TABLE "treatment_telemetry"');
  }
}
