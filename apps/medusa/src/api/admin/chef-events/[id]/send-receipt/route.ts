import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { sendReceiptWorkflow } from "../../../../../workflows/send-receipt"
import { CHEF_EVENT_MODULE } from "../../../../../modules/chef-event"

const sendReceiptSchema = z
  .object({
    recipients: z.array(z.string().email()).optional(),
    notes: z.string().optional(),
    tipAmount: z.number().min(0).optional(),
    tipMethod: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.tipAmount != null && data.tipAmount > 0) {
        return data.tipMethod != null && data.tipMethod.trim().length > 0
      }
      return true
    },
    { message: "tipMethod is required when tipAmount is provided", path: ["tipMethod"] }
  )

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const logger = req.scope.resolve("logger")

  try {
    const chefEventModuleService = req.scope.resolve(CHEF_EVENT_MODULE) as any
    const chefEvent = await chefEventModuleService.retrieveChefEvent(id)

    if (!chefEvent) {
      return res.status(404).json({ message: "Chef event not found" })
    }

    if (!chefEvent.productId) {
      return res
        .status(404)
        .json({ message: "Chef event has no linked product; cannot send receipt" })
    }

    if (chefEvent.status !== "confirmed") {
      return res.status(400).json({
        message: "Only confirmed chef events can have receipts sent",
      })
    }

    const parseResult = sendReceiptSchema.safeParse(req.body ?? {})
    if (!parseResult.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parseResult.error.flatten().fieldErrors,
      })
    }

    const validatedBody = parseResult.data

    const { result } = await sendReceiptWorkflow(req.scope).run({
      input: {
        chefEventId: id,
        recipients: validatedBody.recipients,
        notes: validatedBody.notes,
        tipAmount: validatedBody.tipAmount,
        tipMethod: validatedBody.tipMethod,
      },
    })

    return res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error(
      `Error sending receipt: ${error instanceof Error ? error.message : String(error)}`
    )
    return res.status(500).json({
      success: false,
      message: "Failed to send receipt",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
