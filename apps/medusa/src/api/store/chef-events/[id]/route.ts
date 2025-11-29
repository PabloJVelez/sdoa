import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CHEF_EVENT_MODULE } from "../../../../modules/chef-event"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { id } = req.params

  try {
    const chefEventService = req.scope.resolve("chefEventModuleService") as any
    
    const chefEvent = await chefEventService.retrieveChefEvent(id)
    
    if (!chefEvent) {
      res.status(404).json({
        message: "Chef event not found"
      })
      return
    }

    // Only return confirmed events for storefront
    if (chefEvent.status !== 'confirmed') {
      res.status(404).json({
        message: "Chef event not available"
      })
      return
    }

    res.status(200).json({
      chefEvent: {
        id: chefEvent.id,
        status: chefEvent.status,
        requestedDate: chefEvent.requestedDate,
        requestedTime: chefEvent.requestedTime,
        partySize: chefEvent.partySize,
        eventType: chefEvent.eventType,
        locationType: chefEvent.locationType,
        locationAddress: chefEvent.locationAddress,
        firstName: chefEvent.firstName,
        lastName: chefEvent.lastName,
        email: chefEvent.email,
        phone: chefEvent.phone,
        notes: chefEvent.notes,
        specialRequirements: chefEvent.specialRequirements,
        totalPrice: chefEvent.totalPrice,
        estimatedDuration: chefEvent.estimatedDuration,
        productId: chefEvent.productId,
        acceptedAt: chefEvent.acceptedAt,
        acceptedBy: chefEvent.acceptedBy,
        chefNotes: chefEvent.chefNotes,
        createdAt: chefEvent.created_at,
        updatedAt: chefEvent.updated_at
      }
    })
  } catch (error) {
    console.error('Error retrieving chef event:', error)
    res.status(500).json({
      message: "Internal server error"
    })
  }
} 