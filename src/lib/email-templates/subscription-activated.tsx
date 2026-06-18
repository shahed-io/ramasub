import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  planName?: string
  startsOn?: string
  expiresOn?: string
  loginEmail?: string
  loginPassword?: string
  manageUrl?: string
}

const Email = ({
  name,
  planName,
  startsOn,
  expiresOn,
  loginEmail,
  loginPassword,
  manageUrl = 'https://accessnowbd.com/orders',
}: Props) => (
  <EmailLayout
    preview={`Your ${planName ?? 'subscription'} is active`}
    heading="Subscription activated 🚀"
  >
    <Text style={styles.text}>
      Hi{name ? ` ${name}` : ''}, ধন্যবাদ! আপনার subscription সফলভাবে activate করা হয়েছে।
    </Text>
    <div style={styles.totalBox}>
      {planName && (
        <Text style={styles.row}>
          <span style={styles.label}>Plan:</span> {planName}
        </Text>
      )}
      {startsOn && (
        <Text style={styles.row}>
          <span style={styles.label}>Starts:</span> {startsOn}
        </Text>
      )}
      {expiresOn && (
        <Text style={styles.row}>
          <span style={styles.label}>Expires:</span> {expiresOn}
        </Text>
      )}
      {loginEmail && (
        <Text style={styles.row}>
          <span style={styles.label}>Login email:</span> {loginEmail}
        </Text>
      )}
      {loginPassword && (
        <Text style={styles.row}>
          <span style={styles.label}>Password:</span> {loginPassword}
        </Text>
      )}
    </div>
    <Button style={styles.button} href={manageUrl}>
      Manage subscription
    </Button>
    <Text style={styles.muted}>
      Login করতে সমস্যা হলে WhatsApp-এ আমাদের জানান — আমরা সাথে সাথে সমাধান করে দেব।
    </Text>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'Your subscription is now active 🚀',
  displayName: 'Subscription activated',
  previewData: {
    name: 'Rahim',
    planName: 'Netflix Premium (1 month)',
    startsOn: '12 Jun 2026',
    expiresOn: '12 Jul 2026',
    loginEmail: 'shared-account@accessnowbd.com',
    loginPassword: '••••••••',
    manageUrl: 'https://accessnowbd.com/orders',
  },
} satisfies TemplateEntry

export default Email
