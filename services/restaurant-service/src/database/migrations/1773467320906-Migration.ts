import { MigrationInterface, QueryRunner } from 'typeorm'

export class Migration1773467320906 implements MigrationInterface {
  public name = 'Migration1773467320906'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "menu_item_addons" DROP CONSTRAINT "FK_menu_item_addons_item_id"`,
    )
    await queryRunner.query(
      `ALTER TABLE "menu_item_variants" DROP CONSTRAINT "FK_menu_item_variants_item_id"`,
    )
    await queryRunner.query(`ALTER TABLE "menu_items" DROP CONSTRAINT "FK_menu_items_category_id"`)
    await queryRunner.query(
      `ALTER TABLE "menu_categories" DROP CONSTRAINT "FK_menu_categories_restaurant_id"`,
    )
    await queryRunner.query(
      `ALTER TABLE "operating_hours" DROP CONSTRAINT "FK_operating_hours_restaurant_id"`,
    )
    await queryRunner.query(
      `ALTER TABLE "restaurant_reviews" DROP CONSTRAINT "FK_restaurant_reviews_restaurant_id"`,
    )
    await queryRunner.query(`ALTER TABLE "menu_item_addons" ADD "itemId" uuid`)
    await queryRunner.query(`ALTER TABLE "menu_item_variants" ADD "itemId" uuid`)
    await queryRunner.query(`ALTER TABLE "menu_items" ADD "categoryId" uuid`)
    await queryRunner.query(`ALTER TABLE "menu_categories" ADD "restaurantId" uuid`)
    await queryRunner.query(`ALTER TABLE "operating_hours" ADD "restaurantId" uuid`)
    await queryRunner.query(`ALTER TABLE "restaurant_reviews" ADD "restaurantId" uuid`)
    await queryRunner.query(`ALTER TABLE "menu_item_addons" DROP COLUMN "item_id"`)
    await queryRunner.query(
      `ALTER TABLE "menu_item_addons" ADD "item_id" character varying NOT NULL`,
    )
    await queryRunner.query(`ALTER TABLE "menu_item_variants" DROP COLUMN "item_id"`)
    await queryRunner.query(
      `ALTER TABLE "menu_item_variants" ADD "item_id" character varying NOT NULL`,
    )
    await queryRunner.query(`ALTER TABLE "menu_items" DROP COLUMN "category_id"`)
    await queryRunner.query(`ALTER TABLE "menu_items" ADD "category_id" character varying NOT NULL`)
    await queryRunner.query(`ALTER TABLE "menu_items" DROP COLUMN "created_at"`)
    await queryRunner.query(
      `ALTER TABLE "menu_items" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    )
    await queryRunner.query(`ALTER TABLE "menu_items" DROP COLUMN "updated_at"`)
    await queryRunner.query(
      `ALTER TABLE "menu_items" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    )
    await queryRunner.query(`ALTER TABLE "menu_categories" DROP COLUMN "restaurant_id"`)
    await queryRunner.query(
      `ALTER TABLE "menu_categories" ADD "restaurant_id" character varying NOT NULL`,
    )
    await queryRunner.query(`ALTER TABLE "operating_hours" DROP COLUMN "restaurant_id"`)
    await queryRunner.query(
      `ALTER TABLE "operating_hours" ADD "restaurant_id" character varying NOT NULL`,
    )
    await queryRunner.query(`ALTER TABLE "restaurants" DROP COLUMN "created_at"`)
    await queryRunner.query(
      `ALTER TABLE "restaurants" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    )
    await queryRunner.query(`ALTER TABLE "restaurants" DROP COLUMN "updated_at"`)
    await queryRunner.query(
      `ALTER TABLE "restaurants" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    )
    await queryRunner.query(`ALTER TABLE "restaurant_reviews" DROP COLUMN "restaurant_id"`)
    await queryRunner.query(
      `ALTER TABLE "restaurant_reviews" ADD "restaurant_id" character varying NOT NULL`,
    )
    await queryRunner.query(`ALTER TABLE "restaurant_reviews" DROP COLUMN "created_at"`)
    await queryRunner.query(
      `ALTER TABLE "restaurant_reviews" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    )
    await queryRunner.query(`ALTER TABLE "inventory" DROP COLUMN "updated_at"`)
    await queryRunner.query(
      `ALTER TABLE "inventory" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    )
    await queryRunner.query(
      `ALTER TABLE "menu_item_addons" ADD CONSTRAINT "FK_0b380a7e5fd6e104854f0b26c6f" FOREIGN KEY ("itemId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "menu_item_variants" ADD CONSTRAINT "FK_1a80476d14a6b7bbfa674064f09" FOREIGN KEY ("itemId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "menu_items" ADD CONSTRAINT "FK_d56e5ccc298e8bf721f75a7eb96" FOREIGN KEY ("categoryId") REFERENCES "menu_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "menu_categories" ADD CONSTRAINT "FK_99fac3bd8f4554721f954244df0" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "operating_hours" ADD CONSTRAINT "FK_7983e075318862313b573eebc50" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "restaurant_reviews" ADD CONSTRAINT "FK_3e6d0f5a8ec4fdc5a8c0cd51989" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "restaurant_reviews" DROP CONSTRAINT "FK_3e6d0f5a8ec4fdc5a8c0cd51989"`,
    )
    await queryRunner.query(
      `ALTER TABLE "operating_hours" DROP CONSTRAINT "FK_7983e075318862313b573eebc50"`,
    )
    await queryRunner.query(
      `ALTER TABLE "menu_categories" DROP CONSTRAINT "FK_99fac3bd8f4554721f954244df0"`,
    )
    await queryRunner.query(
      `ALTER TABLE "menu_items" DROP CONSTRAINT "FK_d56e5ccc298e8bf721f75a7eb96"`,
    )
    await queryRunner.query(
      `ALTER TABLE "menu_item_variants" DROP CONSTRAINT "FK_1a80476d14a6b7bbfa674064f09"`,
    )
    await queryRunner.query(
      `ALTER TABLE "menu_item_addons" DROP CONSTRAINT "FK_0b380a7e5fd6e104854f0b26c6f"`,
    )
    await queryRunner.query(`ALTER TABLE "inventory" DROP COLUMN "updated_at"`)
    await queryRunner.query(
      `ALTER TABLE "inventory" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    )
    await queryRunner.query(`ALTER TABLE "restaurant_reviews" DROP COLUMN "created_at"`)
    await queryRunner.query(
      `ALTER TABLE "restaurant_reviews" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    )
    await queryRunner.query(`ALTER TABLE "restaurant_reviews" DROP COLUMN "restaurant_id"`)
    await queryRunner.query(`ALTER TABLE "restaurant_reviews" ADD "restaurant_id" uuid NOT NULL`)
    await queryRunner.query(`ALTER TABLE "restaurants" DROP COLUMN "updated_at"`)
    await queryRunner.query(
      `ALTER TABLE "restaurants" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    )
    await queryRunner.query(`ALTER TABLE "restaurants" DROP COLUMN "created_at"`)
    await queryRunner.query(
      `ALTER TABLE "restaurants" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    )
    await queryRunner.query(`ALTER TABLE "operating_hours" DROP COLUMN "restaurant_id"`)
    await queryRunner.query(`ALTER TABLE "operating_hours" ADD "restaurant_id" uuid NOT NULL`)
    await queryRunner.query(`ALTER TABLE "menu_categories" DROP COLUMN "restaurant_id"`)
    await queryRunner.query(`ALTER TABLE "menu_categories" ADD "restaurant_id" uuid NOT NULL`)
    await queryRunner.query(`ALTER TABLE "menu_items" DROP COLUMN "updated_at"`)
    await queryRunner.query(
      `ALTER TABLE "menu_items" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    )
    await queryRunner.query(`ALTER TABLE "menu_items" DROP COLUMN "created_at"`)
    await queryRunner.query(
      `ALTER TABLE "menu_items" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    )
    await queryRunner.query(`ALTER TABLE "menu_items" DROP COLUMN "category_id"`)
    await queryRunner.query(`ALTER TABLE "menu_items" ADD "category_id" uuid NOT NULL`)
    await queryRunner.query(`ALTER TABLE "menu_item_variants" DROP COLUMN "item_id"`)
    await queryRunner.query(`ALTER TABLE "menu_item_variants" ADD "item_id" uuid NOT NULL`)
    await queryRunner.query(`ALTER TABLE "menu_item_addons" DROP COLUMN "item_id"`)
    await queryRunner.query(`ALTER TABLE "menu_item_addons" ADD "item_id" uuid NOT NULL`)
    await queryRunner.query(`ALTER TABLE "restaurant_reviews" DROP COLUMN "restaurantId"`)
    await queryRunner.query(`ALTER TABLE "operating_hours" DROP COLUMN "restaurantId"`)
    await queryRunner.query(`ALTER TABLE "menu_categories" DROP COLUMN "restaurantId"`)
    await queryRunner.query(`ALTER TABLE "menu_items" DROP COLUMN "categoryId"`)
    await queryRunner.query(`ALTER TABLE "menu_item_variants" DROP COLUMN "itemId"`)
    await queryRunner.query(`ALTER TABLE "menu_item_addons" DROP COLUMN "itemId"`)
    await queryRunner.query(
      `ALTER TABLE "restaurant_reviews" ADD CONSTRAINT "FK_restaurant_reviews_restaurant_id" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "operating_hours" ADD CONSTRAINT "FK_operating_hours_restaurant_id" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "menu_categories" ADD CONSTRAINT "FK_menu_categories_restaurant_id" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "menu_items" ADD CONSTRAINT "FK_menu_items_category_id" FOREIGN KEY ("category_id") REFERENCES "menu_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "menu_item_variants" ADD CONSTRAINT "FK_menu_item_variants_item_id" FOREIGN KEY ("item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "menu_item_addons" ADD CONSTRAINT "FK_menu_item_addons_item_id" FOREIGN KEY ("item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
  }
}
