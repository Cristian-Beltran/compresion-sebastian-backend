import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1764120000000 implements MigrationInterface {
    name = 'Migration1764120000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patients" ADD "age" integer`);
        await queryRunner.query(`ALTER TABLE "patients" ADD "sex" character varying(30)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "sex"`);
        await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "age"`);
    }

}
