import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewColumns1790924549768 implements MigrationInterface {
    name = 'AddNewColumns1790924549768'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Agregar columna actorRole a system_logs
        await queryRunner.query(`ALTER TABLE "system_logs" ADD COLUMN "actorRole" text`);
        
        // Agregar columna medicalReport a treatments
        await queryRunner.query(`ALTER TABLE "treatments" ADD COLUMN "medicalReport" text`);
        
        // Agregar columnas document, phone, diagnosis a patients
        await queryRunner.query(`ALTER TABLE "patients" ADD COLUMN "document" varchar(30)`);
        await queryRunner.query(`ALTER TABLE "patients" ADD COLUMN "phone" varchar(30)`);
        await queryRunner.query(`ALTER TABLE "patients" ADD COLUMN "diagnosis" text`);
        
        // Crear tabla technicals
        await queryRunner.query(`CREATE TABLE "technicals" ("id" varchar PRIMARY KEY NOT NULL, "specialty" varchar, "licenseNumber" varchar, "userId" varchar, CONSTRAINT "REL_tech_user" UNIQUE ("userId"), CONSTRAINT "FK_tech_user" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "technicals"`);
        await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "diagnosis"`);
        await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "document"`);
        await queryRunner.query(`ALTER TABLE "treatments" DROP COLUMN "medicalReport"`);
        await queryRunner.query(`ALTER TABLE "system_logs" DROP COLUMN "actorRole"`);
    }
}
