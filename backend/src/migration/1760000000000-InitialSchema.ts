import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1760000000000 implements MigrationInterface {
  name = 'InitialSchema1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."movies_kind_enum" AS ENUM('film', 'cartoon', 'series', 'cartoon_series', 'show', 'anime', 'anime_series')`);
    await queryRunner.query(`CREATE TYPE "public"."movies_status_enum" AS ENUM('watched', 'watchlist')`);
    await queryRunner.query(`
      CREATE TABLE "movies" (
        "id" SERIAL NOT NULL,
        "title" character varying(255) NOT NULL,
        "kind" "public"."movies_kind_enum" NOT NULL,
        "status" "public"."movies_status_enum" NOT NULL,
        "year" integer,
        "description" text,
        "cover_url" text,
        "personal_rating" numeric(3,1),
        "imdb_url" text,
        "imdb_rating" numeric(3,1),
        "imdb_votes" integer,
        "kp_url" text,
        "kp_rating" numeric(3,1),
        "kp_votes" integer,
        "ms_url" text,
        "ms_rating" numeric(3,1),
        "ms_votes" integer,
        "rt_url" text,
        "rt_critics_rating" numeric(3,1),
        "rt_critics_votes" integer,
        "rt_audience_rating" numeric(3,1),
        "rt_audience_votes" integer,
        "mc_url" text,
        "mc_rating" numeric(3,1),
        "mc_reviews" integer,
        "mc_user_rating" numeric(3,1),
        "mc_user_votes" integer,
        "wa_url" text,
        "wa_rating" numeric(3,1),
        "wa_votes" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_movies_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_movies_title" ON "movies" ("title")`);
    await queryRunner.query(`CREATE INDEX "IDX_movies_kind_status" ON "movies" ("kind", "status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_movies_kind_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_movies_title"`);
    await queryRunner.query(`DROP TABLE "movies"`);
    await queryRunner.query(`DROP TYPE "public"."movies_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."movies_kind_enum"`);
  }
}
