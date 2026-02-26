import { Migration } from '@mikro-orm/migrations';

export class Migration20260223120000_add_tip_fields extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "chef_event" add column if not exists "tip_amount" numeric null;`);
    this.addSql(`alter table if exists "chef_event" add column if not exists "tip_method" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "chef_event" drop column if exists "tip_amount";`);
    this.addSql(`alter table if exists "chef_event" drop column if exists "tip_method";`);
  }
}
