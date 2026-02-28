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
import { layoutColors, layoutStyles } from "./layout-styles"

export type TransactionalEmailLayoutProps = {
  preview?: string
  /** Brand or sender name shown in the header (e.g. "SDOA") */
  brandName: string
  /** Right-side header label (e.g. "RECEIPT", "ORDER CONFIRMATION") */
  headerLabel: string
  /** Left column of the info block (e.g. "Bill to" / recipient details) */
  billToContent: React.ReactNode
  /** Right column of the info block (e.g. ref #, date, status) */
  metaContent: React.ReactNode
  children: React.ReactNode
  thankYouText: string
  customNotes?: string
  /** Footer contact: name, email, optional phone */
  brandContact: {
    name: string
    email: string
    phone: string
  }
}

/**
 * Shared transactional email layout: header (brand + label), info block (bill-to + meta),
 * main content slot, thank-you section, footer with contact and copyright.
 * Used by receipt, order confirmation, and event emails for consistent branding and structure.
 */
export function TransactionalEmailLayout({
  preview = "",
  brandName,
  headerLabel,
  billToContent,
  metaContent,
  children,
  thankYouText,
  customNotes,
  brandContact,
}: TransactionalEmailLayoutProps) {
  return (
    <Html style={layoutStyles.main}>
      <Head>{preview ? <Preview>{preview}</Preview> : null}</Head>
      <Body style={layoutStyles.body}>
        <Section style={layoutStyles.headerSection}>
          <Container>
            <Row>
              <Column style={{ width: "70%" }}>
                <Text style={layoutStyles.headerTitle}>{brandName}</Text>
              </Column>
              <Column align="right" style={{ width: "30%" }}>
                <Text style={layoutStyles.headerLabel}>{headerLabel}</Text>
              </Column>
            </Row>
          </Container>
        </Section>

        <Section style={layoutStyles.infoSection}>
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

        <Section style={layoutStyles.thankYouSection}>
          <Text style={layoutStyles.thankYouText}>{thankYouText}</Text>
          {customNotes && (
            <Text style={layoutStyles.thankYouNotes}>{customNotes}</Text>
          )}
        </Section>

        <Section style={layoutStyles.footerSection}>
          <Text style={layoutStyles.footerText}>
            Questions? Contact {brandContact.name} —{" "}
            <Link href={`mailto:${brandContact.email}`} style={{ color: layoutColors.accentGreen }}>
              {brandContact.email}
            </Link>
            {brandContact.phone ? ` | ${brandContact.phone}` : ""}
          </Text>
          <Text style={layoutStyles.footerCopyright}>
            © {new Date().getFullYear()} {brandContact.name}. All rights reserved.
          </Text>
        </Section>
      </Body>
    </Html>
  )
}
