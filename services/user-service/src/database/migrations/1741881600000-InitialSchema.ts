import type { MigrationInterface, QueryRunner } from 'typeorm'

export class InitialSchema1741881600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Enum types ────────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "users_role_enum" AS ENUM ('customer', 'driver', 'restaurant_owner', 'admin');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "users_status_enum" AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "user_devices_platform_enum" AS ENUM ('ios', 'android', 'web');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `)

    // ─── users ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"                   uuid                NOT NULL DEFAULT uuid_generate_v4(),
        "email"                character varying   UNIQUE,
        "phone"                character varying   UNIQUE,
        "google_id"            character varying   UNIQUE,
        "password_hash"        character varying,
        "role"                 "users_role_enum"   NOT NULL DEFAULT 'customer',
        "status"               "users_status_enum" NOT NULL DEFAULT 'pending_verification',
        "is_email_verified"    boolean             NOT NULL DEFAULT false,
        "is_phone_verified"    boolean             NOT NULL DEFAULT false,
        "created_at"           TIMESTAMPTZ         NOT NULL DEFAULT now(),
        "updated_at"           TIMESTAMPTZ         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_users_email_or_phone" CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL)
      )
    `)

    // ─── user_profiles ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_profiles" (
        "id"             uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"        uuid              UNIQUE,
        "full_name"      character varying NOT NULL,
        "avatar_url"     character varying,
        "date_of_birth"  date,
        "bio"            character varying(500),
        "updated_at"     TIMESTAMPTZ       NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_profiles_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `)

    // ─── user_addresses ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_addresses" (
        "id"           uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"      uuid,
        "label"        character varying(100),
        "full_address" character varying(500) NOT NULL,
        "street"       character varying(200),
        "district"     character varying(100),
        "city"         character varying(100) NOT NULL,
        "country"      character varying(100) NOT NULL DEFAULT 'Vietnam',
        "lat"          numeric(10,7)     NOT NULL,
        "lng"          numeric(10,7)     NOT NULL,
        "is_default"   boolean           NOT NULL DEFAULT false,
        "created_at"   TIMESTAMPTZ       NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_addresses" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_addresses_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `)

    // ─── user_devices ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_devices" (
        "id"             uuid                          NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"        uuid,
        "device_token"   character varying             NOT NULL,
        "platform"       "user_devices_platform_enum"  NOT NULL,
        "device_name"    character varying,
        "last_active_at" TIMESTAMPTZ                   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_devices" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_devices_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `)

    // ─── refresh_tokens ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id"              uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"         uuid,
        "token_hash"      character varying NOT NULL,
        "family_id"       character varying NOT NULL,
        "device_info"     character varying,
        "ip_address"      character varying,
        "expires_at"      TIMESTAMPTZ       NOT NULL,
        "revoked_at"      TIMESTAMPTZ,
        "replaced_by_id"  uuid,
        "created_at"      TIMESTAMPTZ       NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_tokens_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "user_devices"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "user_addresses"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "user_profiles"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "user_devices_platform_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "users_status_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`)
  }
}
