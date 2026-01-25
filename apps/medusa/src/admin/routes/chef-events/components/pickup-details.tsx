import { Input, Label, Textarea, Button, Tabs } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { chefEventUpdateSchema } from "../schemas"
import { SelectedProducts } from "./selected-products"
import type { AdminUpdateChefEventDTO } from "../../../../sdk/admin/admin-chef-events"
import { useState } from "react"

interface PickupDetailsProps {
  chefEvent: any
  onSubmit: (data: AdminUpdateChefEventDTO) => Promise<void>
  isLoading?: boolean
  onCancel?: () => void
}

// Helper function to transform API data to form format
const transformDataForForm = (data: any) => {
  if (!data) return null
  
  try {
    // Transform ISO date to YYYY-MM-DD format for date input
    let requestedDate = ''
    if (data.requestedDate) {
      const date = new Date(data.requestedDate)
      if (!isNaN(date.getTime())) {
        requestedDate = date.toISOString().split('T')[0]
      }
    }
    
    return {
      requestedDate,
      requestedTime: data.requestedTime || '',
      notes: data.notes || '',
      specialRequirements: data.specialRequirements || '',
      status: data.status || 'pending'
    }
  } catch (error) {
    console.error('Error transforming form data:', error)
    return {
      requestedDate: '',
      requestedTime: '',
      notes: '',
      specialRequirements: '',
      status: 'pending'
    }
  }
}

export const PickupDetails = ({ 
  chefEvent, 
  onSubmit, 
  isLoading = false, 
  onCancel 
}: PickupDetailsProps) => {
  const [activeTab, setActiveTab] = useState("general")

  if (!chefEvent) {
    return <div className="p-4">Loading pickup details...</div>
  }

  const formData = transformDataForForm(chefEvent)
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(chefEventUpdateSchema),
    mode: 'onBlur',
    defaultValues: formData || {
      requestedDate: '',
      requestedTime: '',
      notes: '',
      specialRequirements: '',
      status: 'pending'
    }
  })

  const handleFormSubmit = async (data: any) => {
    try {
      // Transform date back to ISO string format for API
      const submitData: AdminUpdateChefEventDTO = {
        ...data,
        requestedDate: data.requestedDate && data.requestedTime
          ? new Date(`${data.requestedDate}T${data.requestedTime}:00`).toISOString()
          : data.requestedDate
            ? new Date(`${data.requestedDate}T12:00:00`).toISOString()
            : undefined,
        // Only include fields that are being updated
        notes: data.notes || undefined,
        specialRequirements: data.specialRequirements || undefined,
        status: data.status || undefined
      }
      await onSubmit(submitData)
    } catch (error) {
      console.error('Error submitting pickup details:', error)
      throw error
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="border-b">
          <Tabs.Trigger value="general">General Info</Tabs.Trigger>
          <Tabs.Trigger value="products">Products</Tabs.Trigger>
          <Tabs.Trigger value="contact">Contact</Tabs.Trigger>
          <Tabs.Trigger value="details">Details</Tabs.Trigger>
        </Tabs.List>

        {/* General Info Tab */}
        <Tabs.Content value="general" className="space-y-4 pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="requestedDate">Pickup Date *</Label>
              <Input
                id="requestedDate"
                type="date"
                {...register("requestedDate", { required: "Pickup date is required" })}
              />
              {errors.requestedDate && (
                <p className="text-red-500 text-sm mt-1">{String(errors.requestedDate.message)}</p>
              )}
            </div>
            <div>
              <Label htmlFor="requestedTime">Pickup Time *</Label>
              <Input
                id="requestedTime"
                type="time"
                {...register("requestedTime", { required: "Pickup time is required" })}
              />
              {errors.requestedTime && (
                <p className="text-red-500 text-sm mt-1">{String(errors.requestedTime.message)}</p>
              )}
            </div>
          </div>

          {/* Pickup Location - Read Only */}
          <div className="space-y-2">
            <Label>Pickup Location</Label>
            <div className="mt-1 p-3 rounded border border-[var(--border-base)] bg-[var(--bg-subtle)]">
              <p className="text-sm text-[var(--fg-base)] font-medium">
                {chefEvent?.pickup_location || chefEvent?.locationAddress || 'Not set'}
              </p>
            </div>
            <p className="text-xs text-[var(--fg-muted)]">Pickup location is set by the system and cannot be changed.</p>
          </div>
        </Tabs.Content>

        {/* Products Tab */}
        <Tabs.Content value="products" className="space-y-4 pt-6">
          <SelectedProducts selectedProducts={chefEvent?.selected_products} />
        </Tabs.Content>

        {/* Contact Tab */}
        <Tabs.Content value="contact" className="space-y-4 pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <div className="mt-1 p-3 rounded border border-[var(--border-base)] bg-[var(--bg-subtle)]">
                <p className="text-sm text-[var(--fg-base)] font-medium">
                  {`${chefEvent?.firstName || ''} ${chefEvent?.lastName || ''}`.trim() || 'N/A'}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="mt-1 p-3 rounded border border-[var(--border-base)] bg-[var(--bg-subtle)]">
                <p className="text-sm text-[var(--fg-base)] font-medium">
                  {chefEvent?.email || 'N/A'}
                </p>
              </div>
            </div>
            {chefEvent?.phone && (
              <div className="space-y-2">
                <Label>Phone</Label>
                <div className="mt-1 p-3 rounded border border-[var(--border-base)] bg-[var(--bg-subtle)]">
                  <p className="text-sm text-[var(--fg-base)] font-medium">
                    {chefEvent.phone}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Tabs.Content>

        {/* Details Tab */}
        <Tabs.Content value="details" className="space-y-4 pt-6">
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              rows={3}
            />
            {errors.notes && (
              <p className="text-red-500 text-sm mt-1">{String(errors.notes.message)}</p>
            )}
          </div>

          <div>
            <Label htmlFor="specialRequirements">Special Requirements</Label>
            <Textarea
              id="specialRequirements"
              {...register("specialRequirements")}
              rows={3}
            />
            {errors.specialRequirements && (
              <p className="text-red-500 text-sm mt-1">{String(errors.specialRequirements.message)}</p>
            )}
          </div>
        </Tabs.Content>
      </Tabs>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2 pt-6 border-t">
        {onCancel && (
          <Button 
            type="button" 
            variant="secondary" 
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button 
          type="submit" 
          isLoading={isLoading}
          disabled={isLoading}
        >
          Update Pickup Details
        </Button>
      </div>
    </form>
  )
}

