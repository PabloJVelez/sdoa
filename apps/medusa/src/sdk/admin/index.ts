import type { Client } from '@medusajs/js-sdk';
import { Admin } from '@medusajs/js-sdk';
import { AdminChefEventsResource } from './admin-chef-events';
import { AdminMenusResource } from './admin-menus';

export class ExtendedAdminSDK extends Admin {
  public chefEvents: AdminChefEventsResource;
  public menus: AdminMenusResource;

  constructor(client: Client) {
    super(client);
    this.chefEvents = new AdminChefEventsResource(client);
    this.menus = new AdminMenusResource(client);
  }
}