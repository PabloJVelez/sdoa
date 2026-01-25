import { Migration } from '@mikro-orm/migrations';

export class Migration20251209010000 extends Migration {
  override async up(): Promise<void> {
    // Extend eventType check to include pickup
    this.addSql(`alter table if exists "chef_event" drop constraint if exists "chef_event_eventType_check";`);
    this.addSql(
      `alter table if exists "chef_event" add constraint "chef_event_eventType_check" check ("eventType" in ('plated_dinner', 'buffet_style', 'pickup'));`,
    );

    // New pickup/product fields
    this.addSql(`alter table if exists "chef_event" add column if not exists "selected_products" jsonb null;`);
    this.addSql(`alter table if exists "chef_event" add column if not exists "pickup_time_slot" text null;`);
    this.addSql(`alter table if exists "chef_event" add column if not exists "pickup_location" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "chef_event" drop constraint if exists "chef_event_eventType_check";`);
    this.addSql(
      `alter table if exists "chef_event" add constraint "chef_event_eventType_check" check ("eventType" in ('plated_dinner', 'buffet_style'));`,
    );

    this.addSql(`alter table if exists "chef_event" drop column if exists "selected_products";`);
    this.addSql(`alter table if exists "chef_event" drop column if exists "pickup_time_slot";`);
    this.addSql(`alter table if exists "chef_event" drop column if exists "pickup_location";`);
  }
}
