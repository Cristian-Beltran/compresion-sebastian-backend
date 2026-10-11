import { MigrationInterface, QueryRunner } from 'typeorm';

/** SQLite requires rebuilding a table to relax NOT NULL columns. */
export class ManualTreatments1790924549769 implements MigrationInterface {
  name = 'ManualTreatments1790924549769';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "treatments" RENAME TO "treatments_previous"`);
    await queryRunner.query(`CREATE TABLE "treatments" (
      "id" varchar PRIMARY KEY NOT NULL,
      "patientId" varchar(36),
      "sessionType" varchar(12) NOT NULL DEFAULT ('patient'),
      "configId" varchar(36),
      "intensity" varchar(20) NOT NULL,
      "treatmentZone" varchar(30) NOT NULL,
      "mobilityLevel" varchar(30),
      "targetPressureKpa" float,
      "holdTimeSeconds" integer,
      "releaseTimeSeconds" integer,
      "cycleTarget" integer,
      "groups" text,
      "startedAt" datetime NOT NULL DEFAULT (datetime('now')),
      "endedAt" datetime,
      "cycleCount" integer NOT NULL DEFAULT (0),
      "medicalReport" text,
      "status" varchar(20) NOT NULL DEFAULT ('running'),
      "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
    )`);
    await queryRunner.query(`INSERT INTO "treatments" (
      "id", "patientId", "sessionType", "configId", "intensity", "treatmentZone", "mobilityLevel",
      "targetPressureKpa", "holdTimeSeconds", "releaseTimeSeconds", "cycleTarget", "groups", "startedAt",
      "endedAt", "cycleCount", "medicalReport", "status", "updatedAt"
    ) SELECT
      "id", "patientId", 'patient', "configId", "intensity", "treatmentZone", "mobilityLevel",
      "targetPressureKpa", "holdTimeSeconds", "releaseTimeSeconds", "cycleTarget", "groups", "startedAt",
      "endedAt", "cycleCount", "medicalReport", "status", "updatedAt"
    FROM "treatments_previous"`);
    await queryRunner.query(`DROP TABLE "treatments_previous"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "treatments" WHERE "sessionType" = 'manual'`);
    await queryRunner.query(`ALTER TABLE "treatments" DROP COLUMN "sessionType"`);
  }
}
