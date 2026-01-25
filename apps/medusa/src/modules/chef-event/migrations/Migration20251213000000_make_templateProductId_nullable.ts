import { Migration } from '@mikro-orm/migrations';

export class Migration20251213000000 extends Migration {
  override async up(): Promise<void> {
    // Make templateProductId nullable to support pickup events
    this.addSql(`alter table if exists "chef_event" alter column "templateProductId" drop not null;`);
  }

  override async down(): Promise<void> {
    // Revert: make templateProductId required again
    // Note: This will fail if there are any null values in the column
    this.addSql(`alter table if exists "chef_event" alter column "templateProductId" set not null;`);
  }
}

