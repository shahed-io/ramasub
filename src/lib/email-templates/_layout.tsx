import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

const SITE = 'Rama Sub'
const SITE_URL = 'https://ramasub.com'
const SUPPORT_EMAIL = 'support@ramasub.com'
const LOGO_URL = 'https://ramasub.com/__l5e/assets-v1/6b147f1c-869f-4fad-92f0-780115851353/rama-logo-new.png'

interface LayoutProps {
  preview: string
  heading: string
  children: React.ReactNode
}

export const EmailLayout = ({ preview, heading, children }: LayoutProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Link href={SITE_URL} style={brandLink}>
            <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
              <tr>
                <td style={{ verticalAlign: 'middle', paddingRight: '12px' }}>
                  <img
                    src={LOGO_URL}
                    alt="Rama Sub"
                    width={44}
                    height={44}
                    style={brandLogo}
                  />
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <span style={brandWord}>
                    <span style={{ color: '#f59e0b' }}>Rama</span>
                    <span style={{ color: '#fb923c' }}> </span>
                    <span style={{ color: '#38bdf8' }}>Sub</span>
                  </span>
                  <br />
                  <span style={brandTag}>RAMASUB.COM.BD</span>
                </td>
              </tr>
            </table>
          </Link>
        </Section>
        <Section style={card}>
          <Heading style={h1}>{heading}</Heading>
          {children}
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          Need help? Email us at{' '}
          <Link href={`mailto:${SUPPORT_EMAIL}`} style={footerLink}>
            {SUPPORT_EMAIL}
          </Link>
          {' '}or visit{' '}
          <Link href={SITE_URL} style={footerLink}>
            ramasub.com
          </Link>
          .
        </Text>
        <Text style={footerSmall}>
          © {new Date().getFullYear()} {SITE}. Dhaka, Bangladesh.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const styles = {
  text: { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 14px' } as const,
  muted: { fontSize: '13px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 12px' } as const,
  button: {
    backgroundColor: '#0f1b3d',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600 as const,
    borderRadius: '8px',
    padding: '12px 22px',
    textDecoration: 'none',
    display: 'inline-block',
  } as const,
  badge: (color: string, bg: string) => ({
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600 as const,
    color,
    backgroundColor: bg,
  }) as const,
  row: { padding: '6px 0', fontSize: '14px', color: '#374151' } as const,
  label: { color: '#6b7280', fontSize: '13px', marginRight: '8px' } as const,
  totalBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '14px 16px',
    margin: '16px 0',
  } as const,
  hr: { borderColor: '#e5e7eb', margin: '20px 0 12px' } as const,
}

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '24px 20px' }
const header = { padding: '0 0 18px' }
const brandLink = {
  textDecoration: 'none',
  display: 'inline-block',
} as const
const brandLogo = {
  display: 'block',
  width: '44px',
  height: '44px',
  borderRadius: '999px',
  border: '2px solid #ffffff',
  boxShadow: '0 4px 14px rgba(15,27,61,0.18)',
  backgroundColor: '#ffffff',
} as const
const brandWord = {
  fontSize: '22px',
  fontWeight: 800 as const,
  letterSpacing: '-0.2px',
  fontFamily: 'Poppins, Arial, Helvetica, sans-serif',
  lineHeight: '1.1',
} as const
const brandTag = {
  fontSize: '10px',
  fontWeight: 700 as const,
  letterSpacing: '0.22em',
  color: '#64748b',
  textTransform: 'uppercase' as const,
} as const
const card = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '24px',
}
const h1 = {
  fontSize: '20px',
  fontWeight: 700 as const,
  color: '#0f1b3d',
  margin: '0 0 14px',
}
const hr = { borderColor: '#e5e7eb', margin: '20px 0 12px' }
const footer = { fontSize: '12px', color: '#6b7280', margin: '0 0 6px', lineHeight: '1.6' }
const footerSmall = { fontSize: '11px', color: '#9ca3af', margin: 0 }
const footerLink = { color: '#0f1b3d', textDecoration: 'underline' }
