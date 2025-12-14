# Experience Types API Documentation

This document describes the Experience Types API endpoints for both Store and Admin interfaces.

## Overview

Experience Types define the different types of culinary experiences available (e.g., Pickup, Plated Dinner, Buffet Style). They are managed through the Admin API and consumed by the Store API.

## Store API

Base URL: `/store/experience-types`

### GET /store/experience-types

Retrieve a list of all active experience types, ordered by `sort_order`.

**Response:**
```json
{
  "experience_types": [
    {
      "id": "exp_01...",
      "name": "Pickup",
      "slug": "pickup",
      "description": "Fresh sushi and bento boxes ready for pickup.",
      "short_description": "Quick & convenient",
      "icon": "🥡",
      "image_url": null,
      "highlights": ["Requested time will be considered", "Chef will suggest closest available slot"],
      "ideal_for": "Quick lunch, Office catering, Dinner at home",
      "pricing_type": "product_based",
      "price_per_unit": null,
      "duration_minutes": null,
      "duration_display": null,
      "is_product_based": true,
      "location_type": "fixed",
      "fixed_location_address": "123 Main St, Austin, TX 78701",
      "requires_advance_notice": false,
      "advance_notice_days": 0,
      "available_time_slots": ["09:00", "09:30", "10:00", ...],
      "time_slot_start": "09:00",
      "time_slot_end": "17:00",
      "time_slot_interval_minutes": 30,
      "min_party_size": 1,
      "max_party_size": null,
      "is_active": true,
      "is_featured": false,
      "sort_order": 1,
      "created_at": "2025-12-09T00:00:00.000Z",
      "updated_at": "2025-12-09T00:00:00.000Z"
    }
  ]
}
```

**Notes:**
- Only returns experience types where `is_active = true`
- Results are ordered by `sort_order` ascending
- Cached for 10 seconds (stale-while-revalidate: 1 hour)

### GET /store/experience-types/:slug

Retrieve a specific experience type by its slug.

**Parameters:**
- `slug` (string, required): The slug of the experience type (e.g., "pickup", "plated_dinner")

**Response:**
```json
{
  "experience_type": {
    "id": "exp_01...",
    "name": "Pickup",
    "slug": "pickup",
    // ... all fields as above
  }
}
```

**Errors:**
- `404 Not Found`: Experience type with the given slug does not exist or is inactive

---

## Admin API

Base URL: `/admin/experience-types`

All Admin API endpoints require authentication.

### GET /admin/experience-types

Retrieve a list of all experience types (including inactive ones).

**Response:**
Same structure as Store API, but includes inactive types.

### POST /admin/experience-types

Create a new experience type.

**Request Body:**
```json
{
  "name": "New Experience Type",
  "slug": "new-experience-type", // Optional - auto-generated from name if not provided
  "description": "Description of the experience",
  "short_description": "Short description", // Optional
  "icon": "🍱", // Optional
  "image_url": "https://example.com/image.jpg", // Optional
  "highlights": ["Feature 1", "Feature 2"], // Optional, array of strings
  "ideal_for": "Ideal for description", // Optional
  "pricing_type": "per_person", // Required: "per_person" | "per_item" | "product_based"
  "price_per_unit": 15000, // Optional, in cents (e.g., 15000 = $150.00)
  "duration_minutes": 240, // Optional
  "duration_display": "4 hours", // Optional
  "is_product_based": false, // Required, boolean
  "location_type": "customer", // Required: "customer" | "fixed"
  "fixed_location_address": null, // Required if location_type is "fixed"
  "requires_advance_notice": true, // Required, boolean
  "advance_notice_days": 7, // Required, number
  "available_time_slots": ["10:00", "11:00", "12:00"], // Optional, array of time strings (HH:MM format)
  "time_slot_start": "10:00", // Optional, HH:MM format
  "time_slot_end": "20:00", // Optional, HH:MM format
  "time_slot_interval_minutes": 30, // Optional, default 30
  "min_party_size": 2, // Required, number
  "max_party_size": 20, // Optional, number or null
  "is_active": true, // Required, boolean
  "is_featured": false, // Required, boolean
  "sort_order": 0 // Required, number
}
```

**Response:**
```json
{
  "experience_type": {
    // Created experience type object
  }
}
```

**Errors:**
- `400 Bad Request`: Validation errors (see response body for details)

**Notes:**
- If `slug` is not provided, it will be auto-generated from the `name` field
- `highlights` and `available_time_slots` default to empty arrays if not provided

### GET /admin/experience-types/:id

Retrieve a specific experience type by ID.

**Parameters:**
- `id` (string, required): The ID of the experience type

**Response:**
```json
{
  "experience_type": {
    // Experience type object
  }
}
```

**Errors:**
- `404 Not Found`: Experience type with the given ID does not exist

### PUT /admin/experience-types/:id

Update an existing experience type.

**Parameters:**
- `id` (string, required): The ID of the experience type to update

**Request Body:**
Same as POST, but all fields are optional (only include fields you want to update).

**Response:**
```json
{
  "experience_type": {
    // Updated experience type object
  }
}
```

**Errors:**
- `400 Bad Request`: Validation errors
- `404 Not Found`: Experience type with the given ID does not exist

### DELETE /admin/experience-types/:id

Delete an experience type.

**Parameters:**
- `id` (string, required): The ID of the experience type to delete

**Response:**
```json
{
  "id": "exp_01...",
  "deleted": true
}
```

**Errors:**
- `404 Not Found`: Experience type with the given ID does not exist

**Notes:**
- This is a soft delete (sets `deleted_at` timestamp)
- Chef events linked to this experience type will have their `experience_type_id` set to null

---

## Data Model

### ExperienceType

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier |
| `name` | string | Yes | Display name |
| `slug` | string | Yes | URL-friendly identifier (unique) |
| `description` | string | Yes | Full description |
| `short_description` | string \| null | No | Brief description |
| `icon` | string \| null | No | Emoji or icon identifier |
| `image_url` | string \| null | No | URL to image |
| `highlights` | string[] \| null | No | Array of highlight features |
| `ideal_for` | string \| null | No | Description of ideal use cases |
| `pricing_type` | enum | Yes | `"per_person"` \| `"per_item"` \| `"product_based"` |
| `price_per_unit` | number \| null | No | Price in cents (e.g., 15000 = $150.00) |
| `duration_minutes` | number \| null | No | Duration in minutes |
| `duration_display` | string \| null | No | Human-readable duration (e.g., "4 hours") |
| `is_product_based` | boolean | Yes | Whether this uses product selection |
| `location_type` | enum | Yes | `"customer"` \| `"fixed"` |
| `fixed_location_address` | string \| null | No | Required if `location_type` is `"fixed"` |
| `requires_advance_notice` | boolean | Yes | Whether advance notice is required |
| `advance_notice_days` | number | Yes | Number of days advance notice required |
| `available_time_slots` | string[] \| null | No | Explicit list of available time slots (HH:MM format) |
| `time_slot_start` | string \| null | No | Start time for generated slots (HH:MM) |
| `time_slot_end` | string \| null | No | End time for generated slots (HH:MM) |
| `time_slot_interval_minutes` | number | Yes | Interval between generated slots (default: 30) |
| `min_party_size` | number | Yes | Minimum number of guests/items |
| `max_party_size` | number \| null | No | Maximum number of guests/items |
| `is_active` | boolean | Yes | Whether this type is active |
| `is_featured` | boolean | Yes | Whether this type is featured |
| `sort_order` | number | Yes | Order for display (lower = first) |
| `created_at` | string | Yes | ISO 8601 timestamp |
| `updated_at` | string | Yes | ISO 8601 timestamp |

---

## Usage Examples

### Creating a Pickup Experience Type

```bash
curl -X POST https://api.example.com/admin/experience-types \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pickup",
    "slug": "pickup",
    "description": "Fresh sushi and bento boxes ready for pickup.",
    "pricing_type": "product_based",
    "is_product_based": true,
    "location_type": "fixed",
    "fixed_location_address": "123 Main St, Austin, TX 78701",
    "requires_advance_notice": false,
    "advance_notice_days": 0,
    "time_slot_start": "09:00",
    "time_slot_end": "17:00",
    "time_slot_interval_minutes": 30,
    "min_party_size": 1,
    "is_active": true,
    "is_featured": false,
    "sort_order": 1
  }'
```

### Creating a Plated Dinner Experience Type

```bash
curl -X POST https://api.example.com/admin/experience-types \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Plated Dinner",
    "slug": "plated_dinner",
    "description": "Elegant multi-course dining experience.",
    "pricing_type": "per_person",
    "price_per_unit": 14999,
    "duration_minutes": 240,
    "duration_display": "4 hours",
    "is_product_based": false,
    "location_type": "customer",
    "requires_advance_notice": true,
    "advance_notice_days": 7,
    "min_party_size": 2,
    "max_party_size": 20,
    "is_active": true,
    "is_featured": true,
    "sort_order": 2
  }'
```

---

## Integration with Chef Events

Experience types are linked to chef events via the `experience_type_id` field on the `chef_event` table. When creating a chef event:

- For **pickup** events: Set `experience_type_id` to the pickup experience type ID, include `selected_products`, and set `eventType` to `"pickup"`
- For **event** types: Set `experience_type_id` to the event experience type ID, include `templateProductId` (menu), and set `eventType` to `"plated_dinner"` or `"buffet_style"`

See the [Chef Events API documentation](./chef-events-api.md) for more details.

