import {
  Text,
  Column,
  Container,
  Html,
  Row,
  Section,
  Head,
  Preview,
  Body,
  Link,
} from "@react-email/components"
import { receiptColors, receiptStyles } from "./receipt-styles"

export type ReceiptLayoutProps = {
  preview?: string
  chefName: string
  headerLabel: string
  billToContent: React.ReactNode
  metaContent: React.ReactNode
  children: React.ReactNode
  thankYouText: string
  customNotes?: string
  chef: {
    name: string
    email: string
    phone: string
  }
}

/**
 * Shared receipt-style layout: header (chef name + label), Bill To + meta, main content, thank-you, footer.
 * Use for receipt and event emails for consistent styling.
 */
export function ReceiptLayout({
  preview = "Receipt",
  chefName,
  headerLabel,
  billToContent,
  metaContent,
  children,
  thankYouText,
  customNotes,
  chef,
}: ReceiptLayoutProps) {
  return (
    <Html style={receiptStyles.main}>
      <Head>{preview ? <Preview>{preview}</Preview> : null}</Head>
      <Body style={receiptStyles.body}>
        <Section style={receiptStyles.headerSection}>
          <Container>
            <Row>
              <Column style={{ width: "70%" }}>
                <Text style={receiptStyles.headerTitle}>{chefName}</Text>
              </Column>
              <Column align="right" style={{ width: "30%" }}>
                <Text style={receiptStyles.headerLabel}>{headerLabel}</Text>
              </Column>
            </Row>
          </Container>
        </Section>

        <Section style={receiptStyles.infoSection}>
          <Row>
            <Column style={{ width: "50%", verticalAlign: "top" }}>
              {billToContent}
            </Column>
            <Column align="right" style={{ width: "50%", verticalAlign: "top" }}>
              {metaContent}
            </Column>
          </Row>
        </Section>

        {children}

        <Section style={receiptStyles.thankYouSection}>
          <Text style={receiptStyles.thankYouText}>{thankYouText}</Text>
          {customNotes && (
            <Text style={receiptStyles.thankYouNotes}>{customNotes}</Text>
          )}
        </Section>

        <Section style={receiptStyles.footerSection}>
          <Text style={receiptStyles.footerText}>
            Questions? Contact {chef.name} —{" "}
            <Link href={`mailto:${chef.email}`} style={{ color: receiptColors.accentGreen }}>
              {chef.email}
            </Link>
            {" "}| {chef.phone}
          </Text>
          <Text style={receiptStyles.footerCopyright}>
            © {new Date().getFullYear()} {chef.name}. All rights reserved.
          </Text>
        </Section>
      </Body>
    </Html>
  )
}
