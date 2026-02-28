import { Text, Column, Row, Section, Button } from "@react-email/components"
import { TransactionalEmailLayout } from "./layout"
import { layoutStyles } from "./layout-styles"

export type EventDetailsResendEmailProps = {
  customer: {
    first_name: string
    last_name: string
    email: string
    phone: string
  }
  booking: {
    date: string
    time: string
    event_type: string
    location_type: string
    location_address: string
    party_size: number
    notes: string
  }
  event: {
    status: string
    total_price: string
    price_per_person: string
  }
  product: {
    id: string
    handle: string
    title: string
    purchase_url: string
  } | null
  chef: {
    name: string
    email: string
    phone: string
  }
  requestReference: string
  customNotes?: string
  emailType: "event_details_resend"
}

function EventDetailsResendEmailComponent({
  customer,
  booking,
  event,
  product,
  chef,
  requestReference,
  customNotes,
}: EventDetailsResendEmailProps) {
  const billToContent = (
    <>
      <Text style={layoutStyles.billToLabel}>BILL TO</Text>
      <Text style={layoutStyles.billToText}>
        {customer.first_name} {customer.last_name}
      </Text>
      <Text style={{ ...layoutStyles.metaText, margin: "0.25rem 0 0 0" }}>{customer.email}</Text>
      <Text style={{ ...layoutStyles.metaText, margin: "0.25rem 0 0 0" }}>{customer.phone}</Text>
    </>
  )

  const metaContent = (
    <>
      <Text style={layoutStyles.metaText}>Ref # {requestReference}</Text>
      <Text style={{ ...layoutStyles.metaText, margin: 0 }}>Status: {event.status?.toUpperCase() ?? "CONFIRMED"}</Text>
    </>
  )

  const bodyContent = (
    <>
      <Section style={layoutStyles.lineItemsSection}>
        <Row style={{ marginBottom: "0.5rem" }}>
          <Column style={{ width: "70%" }}>
            <Text style={layoutStyles.lineItemDescription}>Event details</Text>
            <Text style={layoutStyles.lineItemSubtext}>
              {booking.date} at {booking.time} · {booking.event_type}
            </Text>
          </Column>
        </Row>
        <Row style={{ marginBottom: "0.5rem" }}>
          <Column style={{ width: "70%" }}>
            <Text style={layoutStyles.lineItemDescription}>Date & time</Text>
          </Column>
          <Column align="right" style={{ width: "30%" }}>
            <Text style={layoutStyles.lineItemDescription}>{booking.date}, {booking.time}</Text>
          </Column>
        </Row>
        <Row style={{ marginBottom: "0.5rem" }}>
          <Column style={{ width: "70%" }}>
            <Text style={layoutStyles.lineItemDescription}>Event type</Text>
          </Column>
          <Column align="right" style={{ width: "30%" }}>
            <Text style={layoutStyles.lineItemDescription}>{booking.event_type}</Text>
          </Column>
        </Row>
        <Row style={{ marginBottom: "0.5rem" }}>
          <Column style={{ width: "70%" }}>
            <Text style={layoutStyles.lineItemDescription}>Party size</Text>
          </Column>
          <Column align="right" style={{ width: "30%" }}>
            <Text style={layoutStyles.lineItemDescription}>{booking.party_size} guests</Text>
          </Column>
        </Row>
        <Row style={{ marginBottom: "0.5rem" }}>
          <Column style={{ width: "70%" }}>
            <Text style={layoutStyles.lineItemDescription}>Address</Text>
          </Column>
          <Column align="right" style={{ width: "30%" }}>
            <Text style={layoutStyles.lineItemDescription}>
              {booking.location_address?.replace(/\s+/g, " ").trim() || "—"}
            </Text>
          </Column>
        </Row>
        {booking.notes && (
          <Row style={{ marginBottom: "0.5rem" }}>
            <Column>
              <Text style={layoutStyles.lineItemSubtext}>Notes: {booking.notes}</Text>
            </Column>
          </Row>
        )}
        <Row style={{ marginBottom: "0.5rem" }}>
          <Column style={{ width: "70%" }}>
            <Text style={layoutStyles.lineItemDescription}>Price per person</Text>
          </Column>
          <Column align="right" style={{ width: "30%" }}>
            <Text style={layoutStyles.lineItemDescription}>${event.price_per_person}</Text>
          </Column>
        </Row>
        <Row style={{ marginBottom: "0.5rem" }}>
          <Column style={{ width: "70%" }}>
            <Text style={layoutStyles.lineItemDescription}>Total price</Text>
          </Column>
          <Column align="right" style={{ width: "30%" }}>
            <Text style={layoutStyles.lineItemDescription}>${event.total_price}</Text>
          </Column>
        </Row>
        {product && (
          <Section style={{ textAlign: "center" as const, marginTop: "1rem" }}>
            <Button href={product.purchase_url} style={{ backgroundColor: "#16a34a", color: "#fff", padding: "0.75rem 1.5rem", borderRadius: "6px", fontWeight: 600 }}>
              View Event Details
            </Button>
          </Section>
        )}
        <Text style={{ ...layoutStyles.lineItemSubtext, marginTop: "0.75rem" }}>
          Chef will contact you 24 hours before the event. Ensure your kitchen is ready; communicate dietary restrictions in advance.
        </Text>
      </Section>
    </>
  )

  return (
    <TransactionalEmailLayout
      preview="Your chef event details and confirmation"
      brandName={chef.name}
      headerLabel="EVENT DETAILS"
      billToContent={billToContent}
      metaContent={metaContent}
      thankYouText="Here are your confirmed event details. We're looking forward to creating an amazing culinary experience for you!"
      customNotes={customNotes}
      brandContact={chef}
    >
      {bodyContent}
    </TransactionalEmailLayout>
  )
}

export const eventDetailsResendEmail = (props: EventDetailsResendEmailProps) => (
  <EventDetailsResendEmailComponent {...props} />
)

EventDetailsResendEmailComponent.PreviewProps = {
  customer: {
    first_name: "Jordan",
    last_name: "Smith",
    email: "jordan.smith@example.com",
    phone: "(555) 123-4567",
  },
  booking: {
    date: "Saturday, March 22, 2025",
    time: "6:00 PM",
    event_type: "Dinner Party",
    location_type: "Private Residence",
    location_address: "456 Elm St, Austin, TX 78701",
    party_size: 8,
    notes: "Outdoor seating preferred.",
  },
  event: {
    status: "confirmed",
    total_price: "1200.00",
    price_per_person: "150.00",
  },
  product: {
    id: "prod_01",
    handle: "dinner-party-experience",
    title: "Private Dinner Party Experience",
    purchase_url: "https://example.com/products/dinner-party-experience",
  },
  chef: {
    name: "SDOA",
    email: "support@sdoa.com",
    phone: "",
  },
  requestReference: "CE-2025-001",
  emailType: "event_details_resend",
} as EventDetailsResendEmailProps

export default EventDetailsResendEmailComponent
