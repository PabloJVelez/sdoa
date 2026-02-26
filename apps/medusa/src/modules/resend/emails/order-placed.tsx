import { Text, Column, Row, Section, Img } from "@react-email/components"
import { BigNumberValue, CustomerDTO, OrderDTO } from "@medusajs/framework/types"
import { ReceiptLayout } from "./receipt-layout"
import { receiptStyles } from "./receipt-styles"

export type OrderPlacedEmailProps = {
  order: OrderDTO & {
    customer: CustomerDTO
  }
  email_banner?: {
    body: string
    title: string
    url: string
  }
}

const ORDER_FOOTER_CHEF = {
  name: "Chef Luis Velez",
  email: "support@chefvelez.com",
  phone: "(347) 695-4445",
}

function OrderPlacedEmailComponent({ order }: OrderPlacedEmailProps) {
  const formatter = new Intl.NumberFormat([], {
    style: "currency",
    currencyDisplay: "narrowSymbol",
    currency: order.currency_code,
  })

  const formatPrice = (price: BigNumberValue) => {
    if (typeof price === "number") return formatter.format(price)
    if (typeof price === "string") return formatter.format(parseFloat(price))
    return price?.toString() || ""
  }

  const customerName = [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(" ") ||
    [order.shipping_address?.first_name, order.shipping_address?.last_name].filter(Boolean).join(" ") ||
    "Customer"
  const customerEmail = order.customer?.email ?? ""

  const billToContent = (
    <>
      <Text style={receiptStyles.billToLabel}>BILL TO</Text>
      <Text style={receiptStyles.billToText}>{customerName}</Text>
      {customerEmail && (
        <Text style={{ ...receiptStyles.metaText, margin: "0.25rem 0 0 0" }}>{customerEmail}</Text>
      )}
    </>
  )

  const metaContent = (
    <>
      <Text style={receiptStyles.metaText}>Order # {order.display_id}</Text>
      <Text style={{ ...receiptStyles.metaText, margin: 0 }}>
        Status: CONFIRMED
      </Text>
    </>
  )

  const bodyContent = (
    <>
      <Section style={receiptStyles.lineItemsSection}>
        {order.items?.map((item) => (
          <Row key={item.id} style={{ marginBottom: "0.5rem" }}>
            <Column style={{ width: "70%" }}>
              <Text style={receiptStyles.lineItemDescription}>
                {item.product_title}
                {item.variant_title ? ` — ${item.variant_title}` : ""}
              </Text>
            </Column>
            <Column align="right" style={{ width: "30%" }}>
              <Text style={receiptStyles.lineItemDescription}>
                {formatPrice(item.total)}
              </Text>
            </Column>
          </Row>
        ))}
      </Section>

      <Section style={receiptStyles.totalsSection}>
        <Row>
          <Column style={{ width: "70%" }}>
            <Text style={receiptStyles.metaText}>Subtotal</Text>
          </Column>
          <Column align="right" style={{ width: "30%" }}>
            <Text style={receiptStyles.lineItemDescription}>
              {formatPrice(order.item_total)}
            </Text>
          </Column>
        </Row>
        {order.shipping_methods?.map((method) => (
          <Row style={{ marginTop: "0.25rem" }} key={method.id}>
            <Column style={{ width: "70%" }}>
              <Text style={receiptStyles.metaText}>{method.name}</Text>
            </Column>
            <Column align="right" style={{ width: "30%" }}>
              <Text style={receiptStyles.lineItemDescription}>
                {formatPrice(method.total)}
              </Text>
            </Column>
          </Row>
        ))}
        <Row style={{ marginTop: "0.25rem" }}>
          <Column style={{ width: "70%" }}>
            <Text style={receiptStyles.metaText}>Tax</Text>
          </Column>
          <Column align="right" style={{ width: "30%" }}>
            <Text style={receiptStyles.lineItemDescription}>
              {formatPrice(order.tax_total || 0)}
            </Text>
          </Column>
        </Row>
        <Row style={receiptStyles.totalRow}>
          <Column style={{ width: "70%" }}>
            <Text style={receiptStyles.totalLabel}>Total</Text>
          </Column>
          <Column align="right" style={{ width: "30%" }}>
            <Text style={receiptStyles.totalLabel}>{formatPrice(order.total)}</Text>
          </Column>
        </Row>
      </Section>
    </>
  )

  return (
    <ReceiptLayout
      preview={`Thank you for your order #${order.display_id}`}
      chefName={ORDER_FOOTER_CHEF.name}
      headerLabel="ORDER CONFIRMATION"
      billToContent={billToContent}
      metaContent={metaContent}
      thankYouText="Thank you for your order. We're processing it and will notify you when it ships."
      chef={ORDER_FOOTER_CHEF}
    >
      {bodyContent}
    </ReceiptLayout>
  )
}

export const orderPlacedEmail = (props: OrderPlacedEmailProps) => (
  <OrderPlacedEmailComponent {...props} />
)

OrderPlacedEmailComponent.PreviewProps = {
  order: {
    id: "order_01",
    display_id: 1001,
    currency_code: "usd",
    customer: {
      id: "cus_01",
      email: "jordan.smith@example.com",
      first_name: "Jordan",
      last_name: "Smith",
    },
    shipping_address: {
      first_name: "Jordan",
      last_name: "Smith",
    },
    items: [
      {
        id: "item_01",
        product_title: "Private Dinner Party Experience",
        variant_title: "Standard",
        thumbnail: "https://placehold.co/120x120",
        total: 120000,
      },
    ],
    item_total: 120000,
    shipping_methods: [],
    tax_total: 0,
    total: 120000,
  },
} as unknown as OrderPlacedEmailProps

export default OrderPlacedEmailComponent
