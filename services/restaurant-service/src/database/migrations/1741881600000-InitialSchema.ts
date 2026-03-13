import type { MigrationInterface, QueryRunner } from 'typeorm'

export class InitialSchema1741881600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Enum types ────────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "restaurants_status_enum" AS ENUM ('pending', 'approved', 'active', 'suspended', 'closed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "operating_hours_day_of_week_enum" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `)

    // ─── restaurants ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "restaurants" (
        "id"                    uuid                        NOT NULL DEFAULT uuid_generate_v4(),
        "owner_id"              character varying           NOT NULL,
        "name"                  character varying(200)      NOT NULL,
        "slug"                  character varying(220)      NOT NULL UNIQUE,
        "description"           text,
        "cover_image_url"       character varying,
        "logo_url"              character varying,
        "full_address"          character varying           NOT NULL,
        "city"                  character varying           NOT NULL,
        "country"               character varying           NOT NULL,
        "lat"                   numeric(10,7)               NOT NULL,
        "lng"                   numeric(10,7)               NOT NULL,
        "phone"                 character varying           NOT NULL,
        "cuisine_types"         text                        NOT NULL,
        "price_range"           integer                     NOT NULL DEFAULT 1,
        "status"                "restaurants_status_enum"   NOT NULL DEFAULT 'pending',
        "is_open"               boolean                     NOT NULL DEFAULT false,
        "approved_at"           TIMESTAMPTZ,
        "approved_by"           character varying,
        "rejection_reason"      text,
        "avg_rating"            numeric(3,2)                NOT NULL DEFAULT 0,
        "total_reviews"         integer                     NOT NULL DEFAULT 0,
        "total_orders"          integer                     NOT NULL DEFAULT 0,
        "avg_prep_time_minutes" integer                     NOT NULL DEFAULT 20,
        "min_order_amount"      numeric(10,2)               NOT NULL DEFAULT 0,
        "delivery_fee"          numeric(10,2)               NOT NULL DEFAULT 0,
        "created_at"            TIMESTAMPTZ                 NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMPTZ                 NOT NULL DEFAULT now(),
        CONSTRAINT "PK_restaurants" PRIMARY KEY ("id")
      )
    `)

    // ─── operating_hours ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "operating_hours" (
        "id"            uuid                                  NOT NULL DEFAULT uuid_generate_v4(),
        "restaurant_id" uuid                                  NOT NULL,
        "day_of_week"   "operating_hours_day_of_week_enum"    NOT NULL,
        "open_time"     character varying(5)                  NOT NULL DEFAULT '09:00',
        "close_time"    character varying(5)                  NOT NULL DEFAULT '22:00',
        "is_closed"     boolean                               NOT NULL DEFAULT false,
        CONSTRAINT "PK_operating_hours" PRIMARY KEY ("id"),
        CONSTRAINT "FK_operating_hours_restaurant_id" FOREIGN KEY ("restaurant_id")
          REFERENCES "restaurants" ("id") ON DELETE CASCADE
      )
    `)

    // ─── menu_categories ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "menu_categories" (
        "id"            uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "restaurant_id" uuid              NOT NULL,
        "name"          character varying(100) NOT NULL,
        "description"   text,
        "image_url"     character varying,
        "sort_order"    integer           NOT NULL DEFAULT 0,
        "is_active"     boolean           NOT NULL DEFAULT true,
        CONSTRAINT "PK_menu_categories" PRIMARY KEY ("id"),
        CONSTRAINT "FK_menu_categories_restaurant_id" FOREIGN KEY ("restaurant_id")
          REFERENCES "restaurants" ("id") ON DELETE CASCADE
      )
    `)

    // ─── menu_items ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "menu_items" (
        "id"                uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "category_id"       uuid              NOT NULL,
        "restaurant_id"     character varying NOT NULL,
        "name"              character varying(200) NOT NULL,
        "description"       text,
        "image_url"         character varying,
        "base_price"        numeric(10,2)     NOT NULL,
        "currency"          character varying(10) NOT NULL DEFAULT 'VND',
        "is_available"      boolean           NOT NULL DEFAULT true,
        "prep_time_minutes" integer           NOT NULL DEFAULT 15,
        "calories"          integer,
        "tags"              text              NOT NULL DEFAULT '',
        "is_vegetarian"     boolean           NOT NULL DEFAULT false,
        "is_vegan"          boolean           NOT NULL DEFAULT false,
        "is_gluten_free"    boolean           NOT NULL DEFAULT false,
        "is_halal"          boolean           NOT NULL DEFAULT false,
        "is_spicy"          boolean           NOT NULL DEFAULT false,
        "spicy_level"       integer,
        "created_at"        TIMESTAMPTZ       NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMPTZ       NOT NULL DEFAULT now(),
        CONSTRAINT "PK_menu_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_menu_items_category_id" FOREIGN KEY ("category_id")
          REFERENCES "menu_categories" ("id") ON DELETE CASCADE
      )
    `)

    // ─── menu_item_variants ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "menu_item_variants" (
        "id"               uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "item_id"          uuid              NOT NULL,
        "name"             character varying(100) NOT NULL,
        "price_adjustment" numeric(10,2)     NOT NULL DEFAULT 0,
        "is_default"       boolean           NOT NULL DEFAULT false,
        CONSTRAINT "PK_menu_item_variants" PRIMARY KEY ("id"),
        CONSTRAINT "FK_menu_item_variants_item_id" FOREIGN KEY ("item_id")
          REFERENCES "menu_items" ("id") ON DELETE CASCADE
      )
    `)

    // ─── menu_item_addons ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "menu_item_addons" (
        "id"           uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "item_id"      uuid              NOT NULL,
        "name"         character varying(100) NOT NULL,
        "price"        numeric(10,2)     NOT NULL DEFAULT 0,
        "max_quantity" integer           NOT NULL DEFAULT 1,
        "is_required"  boolean           NOT NULL DEFAULT false,
        CONSTRAINT "PK_menu_item_addons" PRIMARY KEY ("id"),
        CONSTRAINT "FK_menu_item_addons_item_id" FOREIGN KEY ("item_id")
          REFERENCES "menu_items" ("id") ON DELETE CASCADE
      )
    `)

    // ─── inventory ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inventory" (
        "id"                  uuid    NOT NULL DEFAULT uuid_generate_v4(),
        "item_id"             character varying NOT NULL UNIQUE,
        "restaurant_id"       character varying NOT NULL,
        "quantity"            integer NOT NULL DEFAULT 0,
        "low_stock_threshold" integer NOT NULL DEFAULT 5,
        "is_tracked"          boolean NOT NULL DEFAULT false,
        "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory" PRIMARY KEY ("id")
      )
    `)

    // ─── restaurant_reviews ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "restaurant_reviews" (
        "id"               uuid    NOT NULL DEFAULT uuid_generate_v4(),
        "restaurant_id"    uuid    NOT NULL,
        "user_id"          character varying NOT NULL,
        "order_id"         character varying NOT NULL,
        "rating"           integer NOT NULL,
        "comment"          text,
        "images"           text,
        "owner_reply"      text,
        "owner_replied_at" TIMESTAMPTZ,
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_restaurant_reviews" PRIMARY KEY ("id"),
        CONSTRAINT "FK_restaurant_reviews_restaurant_id" FOREIGN KEY ("restaurant_id")
          REFERENCES "restaurants" ("id") ON DELETE CASCADE
      )
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "restaurant_reviews"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "menu_item_addons"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "menu_item_variants"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "menu_items"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "menu_categories"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "operating_hours"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "restaurants"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "operating_hours_day_of_week_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "restaurants_status_enum"`)
  }
}
