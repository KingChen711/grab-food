import type { MigrationInterface, QueryRunner } from 'typeorm'

export class InitialSchema1741881600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "uploads" (
        "id"            uuid              NOT NULL,
        "context"       character varying(50)  NOT NULL,
        "entityId"      character varying,
        "originalKey"   character varying NOT NULL,
        "status"        character varying(20)  NOT NULL DEFAULT 'PENDING',
        "thumbnailKey"  character varying,
        "mediumKey"     character varying,
        "fullKey"       character varying,
        "errorMessage"  character varying,
        "claimedAt"     TIMESTAMPTZ,
        "createdAt"     TIMESTAMPTZ       NOT NULL DEFAULT now(),
        "updatedAt"     TIMESTAMPTZ       NOT NULL DEFAULT now(),
        CONSTRAINT "PK_uploads" PRIMARY KEY ("id")
      )
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "uploads"`)
  }
}
