import { Text, Column, Row, Section, Button } from "@react-email/components"
import { ReceiptLayout } from "./receipt-layout"
import { receiptStyles } from "./receipt-styles"

export type ChefEventRequestedEmailProps = {
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
    conflict: boolean
  }
  requestReference: string
  chefContact: {
    email: string
    phone: string
  }
  emailType: "customer_confirmation" | "chef_notification"
}

const CHEF_FOOTER = {
  name: "Chef Luis Velez",
  email: "support@chefvelez.com",
  phone: "(347) 695-4445",
}

function ChefEventRequestedEmailComponent({
  customer,
  booking,
  event,
  requestReference,
  chefContact,
  emailType,
}: ChefEventRequestedEmailProps) {
  const isCustomerEmail = emailType === "customer_confirmation"

  const billToContent = (
    <>
      <Text style={receiptStyles.billToLabel}>BILL TO</Text>
      <Text style={receiptStyles.billToText}>
        {customer.first_name} {customer.last_name}
      </Text>
      <Text style={{ ...receiptStyles.metaText, margin: "0.25rem 0 0 0" }}>{customer.email}</Text>
      <Text style={{ ...receiptStyles.metaText, margin: "0.25rem 0 0 0" }}>{customer.phone}</Text>
    </>
  )

  const metaContent = (
    <>
      <Text style={receiptStyles.metaText}>Ref # {requestReference}</Text>
      <Text style={{ ...receiptStyles.metaText, margin: 0 }}>Status: {event.status?.toUpperCase() ?? "PENDING"}</Text>
    </>
  )

  const bodyContent = (
    <>
      <Section style={receiptStyles.lineItemsSection}>
        <Row style={{ marginBottom: "0.5rem" }}>
          <Column style={{ width: "70%" }}>
            <Text style={receiptStyles.lineItemDescription}>
              {isCustomerEmail ? "Event request received" : "New event request"}
            </Text>
            <Text style={receiptStyles.lineItemSubtext}>
              {booking.date} at {booking.time} · {booking.event_type}
            </Text>
          </Column>
        </Row>
        <Row style={{ marginBottom: "0.5rem" }}>
          <Column style={{ width: "70%" }}>
            <Text style={receiptStyles.lineItemDescription}>Date & time</Text>
          </Column>
          <Column align="right" style={{ width: "30%" }}>
            <Text style={receiptStyles.lineItemDescription}>{booking.date}, {booking.time}</Text>
          </Column>
        </Row>
        <Row style={{ marginBottom: "0.5rem" }}>
          <Column style={{ width: "70%" }}>
            <Text style={receiptStyles.lineItemDescription}>Event type</Text>
          </Column>
          <Column align="right" style={{ width: "30%" }}>
            <Text style={receiptStyles.lineItemDescription}>{booking.event_type}</Text>
          </Column>
        </Row>
        <Row style={{ marginBottom: "0.5rem" }}>
          <Column style={{ width: "70%" }}>
            <Text style={receiptStyles.lineItemDescription}>Party size</Text>
          </Column>
          <Column align="right" style={{ width: "30%" }}>
            <Text style={receiptStyles.lineItemDescription}>{booking.party_size} guests</Text>
          </Column>
        </Row>
        <Row style={{ marginBottom: "0.5rem" }}>
          <Column style={{ width: "70%" }}>
            <Text style={receiptStyles.lineItemDescription}>Address</Text>
          </Column>
          <Column align="right" style={{ width: "30%" }}>
            <Text style={receiptStyles.lineItemDescription}>
              {booking.location_address?.replace(/\s+/g, " ").trim() || "—"}
            </Text>
          </Column>
        </Row>
        {booking.menu && (
          <Row style={{ marginBottom: "0.5rem" }}>
            <Column style={{ width: "70%" }}>
              <Text style={receiptStyles.lineItemDescription}>Menu</Text>
            </Column>
            <Column align="right" style={{ width: "30%" }}>
              <Text style={receiptStyles.lineItemDescription}>{booking.menu}</Text>
            </Column>
          </Row>
        )}
        {booking.notes && (
          <Row style={{ marginBottom: "0.5rem" }}>
            <Column>
              <Text style={receiptStyles.lineItemSubtext}>Notes: {booking.notes}</Text>
            </Column>
          </Row>
        )}
        <Row style={{ marginBottom: "0.5rem" }}>
          <Column style={{ width: "70%" }}>
            <Text style={receiptStyles.lineItemDescription}>Total price</Text>
          </Column>
          <Column align="right" style={{ width: "30%" }}>
            <Text style={receiptStyles.lineItemDescription}>${event.total_price}</Text>
          </Column>
        </Row>
        {isCustomerEmail && (
          <Text style={{ ...receiptStyles.lineItemSubtext, marginTop: "0.75rem" }}>
            We'll review your request within 24-48 hours. You'll receive an email with our decision. If accepted, you'll get a secure payment link.
          </Text>
        )}
        {!isCustomerEmail && (
          <Section style={{ textAlign: "center" as const, marginTop: "1rem" }}>
            <Button href={`${process.env.ADMIN_BACKEND_URL ?? ""}/admin/chef-events`} style={{ backgroundColor: "#16a34a", color: "#fff", padding: "0.5rem 1rem", borderRadius: "6px", fontWeight: 600, marginRight: "0.5rem" }}>
              View in Admin
            </Button>
          </Section>
        )}
      </Section>
    </>
  )

  return (
    <ReceiptLayout
      preview={isCustomerEmail ? "Your chef event request has been received" : "New chef event request received"}
      chefName={CHEF_FOOTER.name}
      headerLabel="EVENT REQUEST"
      billToContent={billToContent}
      metaContent={metaContent}
      thankYouText={isCustomerEmail ? "Thank you for your event request! We'll be in touch soon." : "New event request received. Please review in the admin."}
      chef={{ ...CHEF_FOOTER, email: chefContact.email, phone: chefContact.phone }}
    >
      {bodyContent}
    </ReceiptLayout>
  )
}

export const chefEventRequestedEmail = (props: ChefEventRequestedEmailProps) => (
  <ChefEventRequestedEmailComponent {...props} />
)

ChefEventRequestedEmailComponent.PreviewProps = {
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
    status: "pending",
    total_price: "1200.00",
    conflict: false,
  },
  requestReference: "CE-2025-001",
  chefContact: {
    email: "chef@example.com",
    phone: "(555) 987-6543",
  },
  emailType: "customer_confirmation",
} as ChefEventRequestedEmailProps

export default ChefEventRequestedEmailComponent
