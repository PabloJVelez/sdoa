import {
  Text,
  Column,
  Row,
  Section,
  Button,
} from "@react-email/components"
import { TransactionalEmailLayout } from "./layout"
import { layoutStyles } from "./layout-styles"

export type ChefEventAcceptedEmailProps = {
  customer: {
    first_name: string
    last_name: string
    email: string
    phone: string
  }
  booking: {
    date: string
    time: string
    menu: string
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
    deposit_required: string
    deposit_deadline: string
    minimum_tickets: number
    is_full_deposit: boolean
  }
  product: {
    id: string
    handle: string
    title: string
    purchase_url: string
  }
  chef: {
    name: string
    email: string
    phone: string
  }
  requestReference: string
  acceptanceDate: string
  chefNotes: string
  emailType: "customer_acceptance"
}

function ChefEventAcceptedEmailComponent({
  customer,
  booking,
  event,
  product,
  chef,
  requestReference,
  acceptanceDate,
  chefNotes,
}: ChefEventAcceptedEmailProps) {
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
      <Text style={{ ...layoutStyles.metaText, margin: 0 }}>Accepted: {acceptanceDate}</Text>
    </>
  )

  const bodyContent = (
    <>
      <Section style={layoutStyles.lineItemsSection}>
        <Row style={{ marginBottom: "0.5rem" }}>
          <Column style={{ width: "70%" }}>
            <Text style={layoutStyles.lineItemDescription}>Booking confirmed</Text>
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
            <Text style={layoutStyles.lineItemDescription}>Address</Text>
          </Column>
          <Column align="right" style={{ width: "30%" }}>
            <Text style={layoutStyles.lineItemDescription}>
              {booking.location_address?.replace(/\s+/g, " ").trim() || "—"}
            </Text>
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
            <Text style={layoutStyles.lineItemDescription}>Total price</Text>
          </Column>
          <Column align="right" style={{ width: "30%" }}>
            <Text style={layoutStyles.lineItemDescription}>${event.total_price}</Text>
          </Column>
        </Row>
        <Row style={{ marginBottom: "0.5rem" }}>
          <Column style={{ width: "70%" }}>
            <Text style={layoutStyles.lineItemDescription}>
              {event.is_full_deposit ? "Full payment required" : "Minimum deposit"}
            </Text>
          </Column>
          <Column align="right" style={{ width: "30%" }}>
            <Text style={layoutStyles.lineItemDescription}>${event.deposit_required}</Text>
          </Column>
        </Row>
        <Row>
          <Column style={{ width: "70%" }}>
            <Text style={layoutStyles.lineItemDescription}>Payment deadline</Text>
          </Column>
          <Column align="right" style={{ width: "30%" }}>
            <Text style={layoutStyles.lineItemDescription}>{event.deposit_deadline}</Text>
          </Column>
        </Row>
      </Section>

      <Section style={{ ...layoutStyles.totalsSection, padding: "0 1.5rem 1rem" }}>
        <Text style={{ ...layoutStyles.lineItemDescription, marginBottom: "0.75rem" }}>
          {event.is_full_deposit
            ? `To secure your booking, please pay the full amount by ${event.deposit_deadline}.`
            : `To secure your booking, please purchase at least ${event.minimum_tickets} tickets by ${event.deposit_deadline}. Additional guests can purchase their tickets later.`}
        </Text>
        <Section style={{ textAlign: "center" as const }}>
          <Button href={product.purchase_url} style={{ backgroundColor: "#16a34a", color: "#fff", padding: "0.75rem 1.5rem", borderRadius: "6px", fontWeight: 600 }}>
            {event.is_full_deposit ? "Pay Full Amount Now" : "Purchase Tickets Now"}
          </Button>
        </Section>
        <Text style={{ ...layoutStyles.lineItemSubtext, marginTop: "1rem", textAlign: "center" }}>
          1. Pay your deposit to secure the booking · 2. Our chef will contact you to discuss menu details · 3. We'll send a reminder 48 hours before the event
        </Text>
      </Section>
    </>
  )

  return (
    <TransactionalEmailLayout
      preview="Great news! Your chef event has been accepted"
      brandName={chef.name}
      headerLabel="BOOKING CONFIRMED"
      billToContent={billToContent}
      metaContent={metaContent}
      thankYouText={`Great news! Your chef has confirmed your booking.${chefNotes ? ` ${chefNotes}` : ""}`}
      brandContact={chef}
    >
      {bodyContent}
    </TransactionalEmailLayout>
  )
}

export const chefEventAcceptedEmail = (props: ChefEventAcceptedEmailProps) => (
  <ChefEventAcceptedEmailComponent {...props} />
)

ChefEventAcceptedEmailComponent.PreviewProps = {
  customer: {
    first_name: "Jordan",
    last_name: "Smith",
    email: "jordan.smith@example.com",
    phone: "(555) 123-4567",
  },
  booking: {
    date: "Saturday, March 22, 2025",
    time: "6:00 PM",
    menu: "Chef's Tasting Menu",
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
    deposit_required: "600.00",
    deposit_deadline: "March 15, 2025",
    minimum_tickets: 4,
    is_full_deposit: false,
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
  acceptanceDate: "March 1, 2025",
  chefNotes: "Looking forward to cooking for you!",
  emailType: "customer_acceptance",
} as ChefEventAcceptedEmailProps

export default ChefEventAcceptedEmailComponent
