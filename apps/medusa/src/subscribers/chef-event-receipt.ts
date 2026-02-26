import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { CHEF_EVENT_MODULE } from "../modules/chef-event"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { DateTime } from "luxon"

type EventData = {
  chefEventId: string
  recipients: string[]
  notes?: string
  tipAmount?: number
  tipMethod?: string
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  cooking_class: "Chef's Cooking Class",
  plated_dinner: "Plated Dinner Service",
  buffet_style: "Buffet Style Service",
  pickup: "Pickup",
}

const LOCATION_TYPE_LABELS: Record<string, string> = {
  customer_location: "at Customer's Location",
  chef_location: "at Chef's Location",
}

const PRICING: Record<string, number> = {
  buffet_style: 99.99,
  cooking_class: 119.99,
  plated_dinner: 149.99,
  pickup: 0,
}

export default async function chefEventReceiptHandler({
  event: { data },
  container,
}: SubscriberArgs<EventData>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  logger.info(`Processing receipt send for chef event: ${data.chefEventId}`)

  try {
    const chefEventModuleService = container.resolve(CHEF_EVENT_MODULE) as any
    const notificationService = container.resolve(Modules.NOTIFICATION)
    const productModuleService = container.resolve(Modules.PRODUCT) as any

    const chefEvent = await chefEventModuleService.retrieveChefEvent(data.chefEventId)
    if (!chefEvent) {
      throw new Error(`Chef event not found: ${data.chefEventId}`)
    }

    if (!chefEvent.productId) {
      throw new Error(`Chef event has no product: ${data.chefEventId}`)
    }

    const product = await productModuleService.retrieveProduct(chefEvent.productId)
    if (!product) {
      throw new Error(`Product not found: ${chefEvent.productId}`)
    }

    const pricePerPerson =
      PRICING[chefEvent.eventType as keyof typeof PRICING] ?? 119.99
    const totalPrice = pricePerPerson * chefEvent.partySize
    const requestedDate =
      typeof chefEvent.requestedDate === "string"
        ? new Date(chefEvent.requestedDate)
        : chefEvent.requestedDate
    const formattedDate = DateTime.fromJSDate(requestedDate).toFormat("LLL d, yyyy")
    const formattedTime = chefEvent.requestedTime
      ? DateTime.fromFormat(chefEvent.requestedTime, "HH:mm").toFormat("h:mm a")
      : chefEvent.requestedTime ?? ""

    const emailData = {
      customer: {
        first_name: chefEvent.firstName,
        last_name: chefEvent.lastName,
        email: chefEvent.email,
        phone: chefEvent.phone || "Not provided",
      },
      booking: {
        date: formattedDate,
        time: formattedTime,
        event_type:
          EVENT_TYPE_LABELS[chefEvent.eventType] || chefEvent.eventType,
        location_type:
          LOCATION_TYPE_LABELS[chefEvent.locationType] || chefEvent.locationType,
        location_address: chefEvent.locationAddress || "Not provided",
        party_size: chefEvent.partySize,
        notes: chefEvent.notes || "No special notes provided",
      },
      event: {
        status: chefEvent.status ?? "confirmed",
        total_price: totalPrice.toFixed(2),
        price_per_person: pricePerPerson.toFixed(2),
      },
      product: {
        id: product.id,
        handle: product.handle,
        title: product.title,
        purchase_url: `${process.env.STOREFRONT_URL ?? "http://localhost:3000"}/products/${product.handle}`,
      },
      purchasedTickets: chefEvent.partySize,
      totalPurchasedPrice: totalPrice.toFixed(2),
      tipAmount: data.tipAmount,
      tipMethod: data.tipMethod,
      chef: {
        name: "Chef Luis Velez",
        email: "support@chefvelez.com",
        phone: "(347) 695-4445",
      },
      requestReference: chefEvent.id.slice(0, 8).toUpperCase(),
      receiptDate: DateTime.now().toFormat("yyyy-MM-dd"),
      customNotes: data.notes,
    }

    const recipients = data.recipients?.length ? data.recipients : [chefEvent.email]
    for (const to of recipients) {
      await notificationService.createNotifications({
        to,
        channel: "email",
        template: "receipt",
        data: emailData,
      })
      logger.info(`Receipt email sent to ${to}`)
    }
  } catch (error) {
    logger.error(
      `Failed to process receipt for ${data.chefEventId}: ${error instanceof Error ? error.message : String(error)}`
    )
    throw error
  }
}

export const config: SubscriberConfig = {
  event: "chef-event.receipt",
}
