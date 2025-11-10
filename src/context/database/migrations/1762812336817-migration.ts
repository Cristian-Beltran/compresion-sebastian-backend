import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1762812336817 implements MigrationInterface {
    name = 'Migration1762812336817'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session_data" DROP CONSTRAINT "FK_3f0a377247128b3d22355f0bc0c"`);
        await queryRunner.query(`ALTER TABLE "session_data" DROP COLUMN "lungCapacity"`);
        await queryRunner.query(`ALTER TABLE "session_data" DROP COLUMN "pulse"`);
        await queryRunner.query(`ALTER TABLE "session_data" DROP COLUMN "oxygenSaturation"`);
        await queryRunner.query(`ALTER TABLE "session_data" ADD "measuredPressure" double precision NOT NULL`);
        await queryRunner.query(`ALTER TABLE "session_data" ADD "temperature" double precision NOT NULL`);
        await queryRunner.query(`ALTER TABLE "session_data" ADD "cycleIndex" integer`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "targetPressure" double precision NOT NULL`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "holdTimeSeconds" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "session_data" ADD CONSTRAINT "FK_3f0a377247128b3d22355f0bc0c" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session_data" DROP CONSTRAINT "FK_3f0a377247128b3d22355f0bc0c"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "holdTimeSeconds"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "targetPressure"`);
        await queryRunner.query(`ALTER TABLE "session_data" DROP COLUMN "cycleIndex"`);
        await queryRunner.query(`ALTER TABLE "session_data" DROP COLUMN "temperature"`);
        await queryRunner.query(`ALTER TABLE "session_data" DROP COLUMN "measuredPressure"`);
        await queryRunner.query(`ALTER TABLE "session_data" ADD "oxygenSaturation" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "session_data" ADD "pulse" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "session_data" ADD "lungCapacity" double precision NOT NULL`);
        await queryRunner.query(`ALTER TABLE "session_data" ADD CONSTRAINT "FK_3f0a377247128b3d22355f0bc0c" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
