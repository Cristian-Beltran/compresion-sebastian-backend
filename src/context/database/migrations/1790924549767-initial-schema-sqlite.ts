import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchemaSqlite1790924549767 implements MigrationInterface {
    name = 'InitialSchemaSqlite1790924549767'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" varchar PRIMARY KEY NOT NULL, "fullname" varchar NOT NULL, "email" varchar NOT NULL, "password" varchar NOT NULL, "address" varchar, "type" text NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "status" text NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "family_members" ("id" varchar PRIMARY KEY NOT NULL, "userId" varchar, CONSTRAINT "REL_ccda8487d562e954d3c93bfbd0" UNIQUE ("userId"))`);
        await queryRunner.query(`CREATE TABLE "patients" ("id" varchar PRIMARY KEY NOT NULL, "age" integer, "sex" varchar(30), "userId" varchar, CONSTRAINT "REL_2c24c3490a26d04b0d70f92057" UNIQUE ("userId"))`);
        await queryRunner.query(`CREATE TABLE "doctors" ("id" varchar PRIMARY KEY NOT NULL, "specialty" varchar, "licenseNumber" varchar, "userId" varchar, CONSTRAINT "REL_55651e05e46413d510215535ed" UNIQUE ("userId"))`);
        await queryRunner.query(`CREATE TABLE "treatments" ("id" varchar PRIMARY KEY NOT NULL, "patientId" varchar(36) NOT NULL, "configId" varchar(36), "intensity" varchar(20) NOT NULL, "treatmentZone" varchar(30) NOT NULL, "mobilityLevel" varchar(30) NOT NULL, "targetPressureKpa" float, "holdTimeSeconds" integer, "releaseTimeSeconds" integer, "cycleTarget" integer, "groups" text, "startedAt" datetime NOT NULL DEFAULT (datetime('now')), "endedAt" datetime, "cycleCount" integer NOT NULL DEFAULT (0), "status" varchar(20) NOT NULL DEFAULT ('running'), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE TABLE "session_data" ("id" varchar PRIMARY KEY NOT NULL, "measuredPressure" float NOT NULL, "temperature" float NOT NULL, "cycleIndex" integer, "recordedAt" datetime NOT NULL DEFAULT (datetime('now')), "sessionId" varchar)`);
        await queryRunner.query(`CREATE TABLE "sessions" ("id" varchar PRIMARY KEY NOT NULL, "startedAt" datetime NOT NULL DEFAULT (datetime('now')), "endedAt" datetime, "targetPressure" float NOT NULL, "holdTimeSeconds" integer NOT NULL, "patientId" varchar)`);
        await queryRunner.query(`CREATE TABLE "system_logs" ("id" varchar PRIMARY KEY NOT NULL, "level" text NOT NULL, "source" text NOT NULL, "message" text NOT NULL, "category" text, "eventType" text, "deviceId" text, "groupId" integer, "treatmentId" text, "actorUserId" text, "requestId" text, "metadata" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE TABLE "therapy_configs" ("id" varchar PRIMARY KEY NOT NULL, "intensity" text NOT NULL, "targetPressureKpa" float NOT NULL, "inflateTimeSeconds" integer NOT NULL DEFAULT (15), "holdTimeSeconds" integer NOT NULL, "releaseTimeSeconds" integer NOT NULL, "cycleTarget" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_774677f5df14e54676475e2eea9" UNIQUE ("intensity"))`);
        await queryRunner.query(`CREATE TABLE "sensor_calibrations" ("id" varchar PRIMARY KEY NOT NULL, "deviceId" text NOT NULL DEFAULT ('esp32-01'), "groupId" integer NOT NULL, "sensorType" text NOT NULL, "status" text NOT NULL DEFAULT ('pending'), "zeroRaw" float, "referenceRaw" float, "referenceValue" float, "referenceUnit" text, "priorCoefficient" float, "coefficient" float, "actorUserId" text NOT NULL, "requestId" text, "notes" text, "failureReason" text, "completedAt" datetime, "metadata" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE TABLE "alerts" ("id" varchar PRIMARY KEY NOT NULL, "severity" text NOT NULL, "message" text NOT NULL, "active" boolean NOT NULL DEFAULT (1), "resolvedAt" datetime, "metadata" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE TABLE "family_patients" ("familyMembersId" varchar NOT NULL, "patientsId" varchar NOT NULL, PRIMARY KEY ("familyMembersId", "patientsId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_34a9e0939afa2c33c87686a6ee" ON "family_patients" ("familyMembersId") `);
        await queryRunner.query(`CREATE INDEX "IDX_f5c0bb99890eb945d343e1bff8" ON "family_patients" ("patientsId") `);
        await queryRunner.query(`CREATE TABLE "temporary_family_members" ("id" varchar PRIMARY KEY NOT NULL, "userId" varchar, CONSTRAINT "REL_ccda8487d562e954d3c93bfbd0" UNIQUE ("userId"), CONSTRAINT "FK_ccda8487d562e954d3c93bfbd0c" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_family_members"("id", "userId") SELECT "id", "userId" FROM "family_members"`);
        await queryRunner.query(`DROP TABLE "family_members"`);
        await queryRunner.query(`ALTER TABLE "temporary_family_members" RENAME TO "family_members"`);
        await queryRunner.query(`CREATE TABLE "temporary_patients" ("id" varchar PRIMARY KEY NOT NULL, "age" integer, "sex" varchar(30), "userId" varchar, CONSTRAINT "REL_2c24c3490a26d04b0d70f92057" UNIQUE ("userId"), CONSTRAINT "FK_2c24c3490a26d04b0d70f92057a" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_patients"("id", "age", "sex", "userId") SELECT "id", "age", "sex", "userId" FROM "patients"`);
        await queryRunner.query(`DROP TABLE "patients"`);
        await queryRunner.query(`ALTER TABLE "temporary_patients" RENAME TO "patients"`);
        await queryRunner.query(`CREATE TABLE "temporary_doctors" ("id" varchar PRIMARY KEY NOT NULL, "specialty" varchar, "licenseNumber" varchar, "userId" varchar, CONSTRAINT "REL_55651e05e46413d510215535ed" UNIQUE ("userId"), CONSTRAINT "FK_55651e05e46413d510215535edf" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_doctors"("id", "specialty", "licenseNumber", "userId") SELECT "id", "specialty", "licenseNumber", "userId" FROM "doctors"`);
        await queryRunner.query(`DROP TABLE "doctors"`);
        await queryRunner.query(`ALTER TABLE "temporary_doctors" RENAME TO "doctors"`);
        await queryRunner.query(`CREATE TABLE "temporary_session_data" ("id" varchar PRIMARY KEY NOT NULL, "measuredPressure" float NOT NULL, "temperature" float NOT NULL, "cycleIndex" integer, "recordedAt" datetime NOT NULL DEFAULT (datetime('now')), "sessionId" varchar, CONSTRAINT "FK_3f0a377247128b3d22355f0bc0c" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_session_data"("id", "measuredPressure", "temperature", "cycleIndex", "recordedAt", "sessionId") SELECT "id", "measuredPressure", "temperature", "cycleIndex", "recordedAt", "sessionId" FROM "session_data"`);
        await queryRunner.query(`DROP TABLE "session_data"`);
        await queryRunner.query(`ALTER TABLE "temporary_session_data" RENAME TO "session_data"`);
        await queryRunner.query(`CREATE TABLE "temporary_sessions" ("id" varchar PRIMARY KEY NOT NULL, "startedAt" datetime NOT NULL DEFAULT (datetime('now')), "endedAt" datetime, "targetPressure" float NOT NULL, "holdTimeSeconds" integer NOT NULL, "patientId" varchar, CONSTRAINT "FK_a9af6b7e40b0b2f0ba730cd4c21" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_sessions"("id", "startedAt", "endedAt", "targetPressure", "holdTimeSeconds", "patientId") SELECT "id", "startedAt", "endedAt", "targetPressure", "holdTimeSeconds", "patientId" FROM "sessions"`);
        await queryRunner.query(`DROP TABLE "sessions"`);
        await queryRunner.query(`ALTER TABLE "temporary_sessions" RENAME TO "sessions"`);
        await queryRunner.query(`DROP INDEX "IDX_34a9e0939afa2c33c87686a6ee"`);
        await queryRunner.query(`DROP INDEX "IDX_f5c0bb99890eb945d343e1bff8"`);
        await queryRunner.query(`CREATE TABLE "temporary_family_patients" ("familyMembersId" varchar NOT NULL, "patientsId" varchar NOT NULL, CONSTRAINT "FK_34a9e0939afa2c33c87686a6eea" FOREIGN KEY ("familyMembersId") REFERENCES "family_members" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_f5c0bb99890eb945d343e1bff87" FOREIGN KEY ("patientsId") REFERENCES "patients" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, PRIMARY KEY ("familyMembersId", "patientsId"))`);
        await queryRunner.query(`INSERT INTO "temporary_family_patients"("familyMembersId", "patientsId") SELECT "familyMembersId", "patientsId" FROM "family_patients"`);
        await queryRunner.query(`DROP TABLE "family_patients"`);
        await queryRunner.query(`ALTER TABLE "temporary_family_patients" RENAME TO "family_patients"`);
        await queryRunner.query(`CREATE INDEX "IDX_34a9e0939afa2c33c87686a6ee" ON "family_patients" ("familyMembersId") `);
        await queryRunner.query(`CREATE INDEX "IDX_f5c0bb99890eb945d343e1bff8" ON "family_patients" ("patientsId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_f5c0bb99890eb945d343e1bff8"`);
        await queryRunner.query(`DROP INDEX "IDX_34a9e0939afa2c33c87686a6ee"`);
        await queryRunner.query(`ALTER TABLE "family_patients" RENAME TO "temporary_family_patients"`);
        await queryRunner.query(`CREATE TABLE "family_patients" ("familyMembersId" varchar NOT NULL, "patientsId" varchar NOT NULL, PRIMARY KEY ("familyMembersId", "patientsId"))`);
        await queryRunner.query(`INSERT INTO "family_patients"("familyMembersId", "patientsId") SELECT "familyMembersId", "patientsId" FROM "temporary_family_patients"`);
        await queryRunner.query(`DROP TABLE "temporary_family_patients"`);
        await queryRunner.query(`CREATE INDEX "IDX_f5c0bb99890eb945d343e1bff8" ON "family_patients" ("patientsId") `);
        await queryRunner.query(`CREATE INDEX "IDX_34a9e0939afa2c33c87686a6ee" ON "family_patients" ("familyMembersId") `);
        await queryRunner.query(`ALTER TABLE "sessions" RENAME TO "temporary_sessions"`);
        await queryRunner.query(`CREATE TABLE "sessions" ("id" varchar PRIMARY KEY NOT NULL, "startedAt" datetime NOT NULL DEFAULT (datetime('now')), "endedAt" datetime, "targetPressure" float NOT NULL, "holdTimeSeconds" integer NOT NULL, "patientId" varchar)`);
        await queryRunner.query(`INSERT INTO "sessions"("id", "startedAt", "endedAt", "targetPressure", "holdTimeSeconds", "patientId") SELECT "id", "startedAt", "endedAt", "targetPressure", "holdTimeSeconds", "patientId" FROM "temporary_sessions"`);
        await queryRunner.query(`DROP TABLE "temporary_sessions"`);
        await queryRunner.query(`ALTER TABLE "session_data" RENAME TO "temporary_session_data"`);
        await queryRunner.query(`CREATE TABLE "session_data" ("id" varchar PRIMARY KEY NOT NULL, "measuredPressure" float NOT NULL, "temperature" float NOT NULL, "cycleIndex" integer, "recordedAt" datetime NOT NULL DEFAULT (datetime('now')), "sessionId" varchar)`);
        await queryRunner.query(`INSERT INTO "session_data"("id", "measuredPressure", "temperature", "cycleIndex", "recordedAt", "sessionId") SELECT "id", "measuredPressure", "temperature", "cycleIndex", "recordedAt", "sessionId" FROM "temporary_session_data"`);
        await queryRunner.query(`DROP TABLE "temporary_session_data"`);
        await queryRunner.query(`ALTER TABLE "doctors" RENAME TO "temporary_doctors"`);
        await queryRunner.query(`CREATE TABLE "doctors" ("id" varchar PRIMARY KEY NOT NULL, "specialty" varchar, "licenseNumber" varchar, "userId" varchar, CONSTRAINT "REL_55651e05e46413d510215535ed" UNIQUE ("userId"))`);
        await queryRunner.query(`INSERT INTO "doctors"("id", "specialty", "licenseNumber", "userId") SELECT "id", "specialty", "licenseNumber", "userId" FROM "temporary_doctors"`);
        await queryRunner.query(`DROP TABLE "temporary_doctors"`);
        await queryRunner.query(`ALTER TABLE "patients" RENAME TO "temporary_patients"`);
        await queryRunner.query(`CREATE TABLE "patients" ("id" varchar PRIMARY KEY NOT NULL, "age" integer, "sex" varchar(30), "userId" varchar, CONSTRAINT "REL_2c24c3490a26d04b0d70f92057" UNIQUE ("userId"))`);
        await queryRunner.query(`INSERT INTO "patients"("id", "age", "sex", "userId") SELECT "id", "age", "sex", "userId" FROM "temporary_patients"`);
        await queryRunner.query(`DROP TABLE "temporary_patients"`);
        await queryRunner.query(`ALTER TABLE "family_members" RENAME TO "temporary_family_members"`);
        await queryRunner.query(`CREATE TABLE "family_members" ("id" varchar PRIMARY KEY NOT NULL, "userId" varchar, CONSTRAINT "REL_ccda8487d562e954d3c93bfbd0" UNIQUE ("userId"))`);
        await queryRunner.query(`INSERT INTO "family_members"("id", "userId") SELECT "id", "userId" FROM "temporary_family_members"`);
        await queryRunner.query(`DROP TABLE "temporary_family_members"`);
        await queryRunner.query(`DROP INDEX "IDX_f5c0bb99890eb945d343e1bff8"`);
        await queryRunner.query(`DROP INDEX "IDX_34a9e0939afa2c33c87686a6ee"`);
        await queryRunner.query(`DROP TABLE "family_patients"`);
        await queryRunner.query(`DROP TABLE "alerts"`);
        await queryRunner.query(`DROP TABLE "sensor_calibrations"`);
        await queryRunner.query(`DROP TABLE "therapy_configs"`);
        await queryRunner.query(`DROP TABLE "system_logs"`);
        await queryRunner.query(`DROP TABLE "sessions"`);
        await queryRunner.query(`DROP TABLE "session_data"`);
        await queryRunner.query(`DROP TABLE "treatments"`);
        await queryRunner.query(`DROP TABLE "doctors"`);
        await queryRunner.query(`DROP TABLE "patients"`);
        await queryRunner.query(`DROP TABLE "family_members"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
