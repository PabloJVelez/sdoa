import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { z } from "zod"
import { updateChefEventWorkflow } from "../../../../workflows/update-chef-event"
import { deleteChefEventWorkflow } from "../../../../workflows/delete-chef-event"
import { CHEF_EVENT_MODULE } from "../../../../modules/chef-event"

const updateChefEventSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  requestedDate: z.string().optional(),
  requestedTime: z.string().optional(),
  partySize: z.number().min(1).max(50).optional(),
  eventType: z.enum(['cooking_class', 'plated_dinner', 'buffet_style']).optional(),
  templateProductId: z.string().optional(),
  locationType: z.enum(['customer_location', 'chef_location']).optional(),
  locationAddress: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  totalPrice: z.number().optional(),
  depositPaid: z.boolean().optional(),
  specialRequirements: z.string().optional(),
  estimatedDuration: z.number().optional()
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const chefEventModuleService = req.scope.resolve(CHEF_EVENT_MODULE) as any
  const { id } = req.params

  const chefEvent = await chefEventModuleService.retrieveChefEvent(id)

  if (!chefEvent) {
    return res.status(404).json({ message: "Chef event not found" })
  }

  let availableTickets: number | undefined
  if (chefEvent.productId) {
    try {
      const productModuleService = req.scope.resolve(Modules.PRODUCT) as any
      const inventoryModuleService = req.scope.resolve(Modules.INVENTORY) as any

      const variants = await productModuleService.listProductVariants?.(
        { product_id: chefEvent.productId }
      ) ?? []
      const variantList = Array.isArray(variants) ? variants : (variants?.variants ?? variants?.data ?? [])

      let total = 0
      for (const variant of variantList) {
        const sku = variant.sku ?? variant?.options?.sku
        if (!sku) continue
        const items = await inventoryModuleService.listInventoryItems({ sku })
        if (!items?.length) continue
        const levels = await inventoryModuleService.listInventoryLevels({
          inventory_item_id: items[0].id,
        })
        const levelsList = Array.isArray(levels) ? levels : (levels?.inventory_levels ?? levels?.data ?? [])
        for (const level of levelsList) {
          const stocked = Number(level.stocked_quantity ?? 0)
          const reserved = Number(level.reserved_quantity ?? 0)
          total += Math.max(0, stocked - reserved)
        }
      }
      availableTickets = total
    } catch {
      availableTickets = 0
    }
  }

  const payload = { ...chefEvent, ...(availableTickets !== undefined && { availableTickets }) }
  res.json({ chefEvent: payload })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const validatedBody = updateChefEventSchema.parse(req.body)
  
  const { result } = await updateChefEventWorkflow(req.scope).run({
    input: {
      id,
      ...validatedBody
    }
  })
  
  res.json({ chefEvent: result.chefEvent })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  
  const { result } = await deleteChefEventWorkflow(req.scope).run({
    input: { id }
  })
  
  res.json({ deleted: result.result.deleted })
} 