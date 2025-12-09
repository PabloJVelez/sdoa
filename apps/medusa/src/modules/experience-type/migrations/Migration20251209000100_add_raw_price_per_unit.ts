import { Migration } from '@mikro-orm/migrations';

/**
 * Adds the raw_price_per_unit column to experience_type for compatibility with Medusa's pricing metadata.
 * This is a lightweight alter; safe to run on existing data.
 */
export class Migration20251209000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "experience_type" add column if not exists "raw_price_per_unit" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "experience_type" drop column if exists "raw_price_per_unit";`);
  }
}
