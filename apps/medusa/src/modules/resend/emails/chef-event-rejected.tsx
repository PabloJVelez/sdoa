import { Text, Column, Row, Section } from "@react-email/components"
import { ReceiptLayout } from "./receipt-layout"
import { receiptStyles } from "./receipt-styles"

export type ChefEventRejectedEmailProps = {
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
  rejection: {
    reason: string
    chefNotes: string
  }
  chef: {
    name: string
    email: string
    phone: string
  }
  requestReference: string
  rejectionDate: string
  emailType: "customer_rejection"
}

function ChefEventRejectedEmailComponent({
  customer,
  booking,
  rejection,
  chef,
  requestReference,
  rejectionDate,
}: ChefEventRejectedEmailProps) {
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
      <Text style={{ ...receiptStyles.metaText, margin: 0 }}>Updated: {rejectionDate}</Text>
    </>
  )

  const bodyContent = (
    <Section style={receiptStyles.lineItemsSection}>
      <Row style={{ marginBottom: "0.5rem" }}>
        <Column style={{ width: "70%" }}>
          <Text style={receiptStyles.lineItemDescription}>Request details</Text>
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
      <Row style={{ marginBottom: "0.75rem" }}>
        <Column style={{ width: "70%" }}>
          <Text style={receiptStyles.lineItemDescription}>Address</Text>
        </Column>
        <Column align="right" style={{ width: "30%" }}>
          <Text style={receiptStyles.lineItemDescription}>
            {booking.location_address?.replace(/\s+/g, " ").trim() || "—"}
          </Text>
        </Column>
      </Row>
      <Row style={{ marginBottom: "0.5rem" }}>
        <Column>
          <Text style={receiptStyles.lineItemDescription}>Reason for decline</Text>
        </Column>
      </Row>
      <Row style={{ marginBottom: "0.5rem" }}>
        <Column>
          <Text style={receiptStyles.lineItemSubtext}>{rejection.reason}</Text>
        </Column>
      </Row>
      {rejection.chefNotes && (
        <>
          <Row style={{ marginBottom: "0.25rem" }}>
            <Column>
              <Text style={receiptStyles.lineItemDescription}>Additional notes from chef</Text>
            </Column>
          </Row>
          <Row style={{ marginBottom: "0.5rem" }}>
            <Column>
              <Text style={{ ...receiptStyles.lineItemSubtext, fontStyle: "italic" }}>&quot;{rejection.chefNotes}&quot;</Text>
            </Column>
          </Row>
        </>
      )}
      <Text style={{ ...receiptStyles.lineItemSubtext, marginTop: "0.5rem" }}>
        We'd love to work with you in the future. Consider a different date, explore other event types, or contact us for custom arrangements.
      </Text>
    </Section>
  )

  return (
    <ReceiptLayout
      preview="Update regarding your chef event request"
      chefName={chef.name}
      headerLabel="EVENT UPDATE"
      billToContent={billToContent}
      metaContent={metaContent}
      thankYouText="Thank you for your interest in our chef services. We hope to serve you in the future."
      chef={chef}
    >
      {bodyContent}
    </ReceiptLayout>
  )
}

export const chefEventRejectedEmail = (props: ChefEventRejectedEmailProps) => (
  <ChefEventRejectedEmailComponent {...props} />
)

ChefEventRejectedEmailComponent.PreviewProps = {
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
  rejection: {
    reason: "Schedule conflict",
    chefNotes: "Unfortunately I have another commitment that weekend. I'd love to work with you on a different date.",
  },
  chef: {
    name: "Chef Luis Velez",
    email: "chef@example.com",
    phone: "(555) 987-6543",
  },
  requestReference: "CE-2025-001",
  rejectionDate: "March 1, 2025",
  emailType: "customer_rejection",
} as ChefEventRejectedEmailProps

export default ChefEventRejectedEmailComponent
