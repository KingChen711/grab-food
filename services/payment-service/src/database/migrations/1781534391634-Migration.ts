import { MigrationInterface, QueryRunner } from 'typeorm'

export class Migration1781534391634 implements MigrationInterface {
  public name = 'Migration1781534391634'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "wallet_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "wallet_id" uuid NOT NULL, "type" character varying(30) NOT NULL, "amount" bigint NOT NULL, "balance_before" bigint NOT NULL, "balance_after" bigint NOT NULL, "description" text NOT NULL, "reference_id" character varying, "reference_type" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5120f131bde2cda940ec1a621db" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_c57d19129968160f4db28fc8b2" ON "wallet_transactions" ("wallet_id") `,
    )
    await queryRunner.query(
      `CREATE TABLE "wallets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "balance" bigint NOT NULL, "currency" character varying(10) NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "payouts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "recipient_id" character varying NOT NULL, "recipient_type" character varying NOT NULL, "amount" bigint NOT NULL, "currency" character varying(10) NOT NULL, "status" character varying(50) NOT NULL DEFAULT 'PENDING', "stripe_transfer_id" character varying, "period_start" TIMESTAMP WITH TIME ZONE NOT NULL, "period_end" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_76855dc4f0a6c18c72eea302e87" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_8cf01b9a633b75f56a0032eeac" ON "payouts" ("recipient_id", "period_start") `,
    )
    await queryRunner.query(
      `CREATE TABLE "refunds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" character varying NOT NULL, "payment_id" character varying NOT NULL, "amount" bigint NOT NULL, "reason" text NOT NULL, "status" character varying(50) NOT NULL DEFAULT 'PENDING', "stripe_refund_id" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5106efb01eeda7e49a78b869738" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "order_id" character varying NOT NULL, "items" jsonb NOT NULL DEFAULT '[]', "subtotal" integer NOT NULL, "delivery_fee" integer NOT NULL, "tax" integer NOT NULL, "discount" integer NOT NULL, "total" integer NOT NULL, "currency" character varying(10) NOT NULL, "pdf_url" text, "issued_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" character varying NOT NULL, "user_id" character varying NOT NULL, "amount" bigint NOT NULL, "currency" character varying(10) NOT NULL, "method" character varying(50) NOT NULL, "status" character varying(50) NOT NULL DEFAULT 'PENDING', "stripe_payment_intent_id" text, "idempotency_key" text NOT NULL, "failure_reason" text, "metadata" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_b2f7b823a21562eeca20e72b00" ON "payments" ("order_id") `,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_59dcef70bd19850783c84f840e" ON "payments" ("idempotency_key") `,
    )
    await queryRunner.query(
      `CREATE TABLE "saved_payment_methods" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "type" character varying(20) NOT NULL, "stripe_payment_method_id" character varying NOT NULL, "brand" character varying(50) NOT NULL, "last4" character varying(4) NOT NULL, "exp_month" integer NOT NULL, "exp_year" integer NOT NULL, "is_default" boolean NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d92af22c1c4ce0a5f8d7532e286" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" ADD CONSTRAINT "FK_c57d19129968160f4db28fc8b28" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" DROP CONSTRAINT "FK_c57d19129968160f4db28fc8b28"`,
    )
    await queryRunner.query(`DROP TABLE "saved_payment_methods"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_59dcef70bd19850783c84f840e"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_b2f7b823a21562eeca20e72b00"`)
    await queryRunner.query(`DROP TABLE "payments"`)
    await queryRunner.query(`DROP TABLE "invoices"`)
    await queryRunner.query(`DROP TABLE "refunds"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_8cf01b9a633b75f56a0032eeac"`)
    await queryRunner.query(`DROP TABLE "payouts"`)
    await queryRunner.query(`DROP TABLE "wallets"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_c57d19129968160f4db28fc8b2"`)
    await queryRunner.query(`DROP TABLE "wallet_transactions"`)
  }
}
