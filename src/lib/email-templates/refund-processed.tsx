import * as React from 'react'
import { Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  orderId?: string
  amount?: string
  refundMethod?: string
  expectedBy?: string
  reason?: string
}

const Email = ({ name, orderId, amount, refundMethod, expectedBy, reason }: Props) => (
  <EmailLayout
    preview={`Refund of ৳${amount ?? ''} processed`}
    heading="Refund processed 💸"
  >
    <Text style={styles.text}>
      Hi{name ? ` ${name}` : ''}, আপনার refund সফলভাবে process করা হয়েছে।
    </Text>
    <div style={styles.totalBox}>
      {orderId && (
        <Text style={styles.row}>
          <span style={styles.label}>Order ID:</span> {orderId}
        </Text>
      )}
      {amount && (
        <Text style={{ ...styles.row, fontWeight: 700 }}>
          <span style={styles.label}>Refund amount:</span> ৳{amount}
        </Text>
      )}
      {refundMethod && (
        <Text style={styles.row}>
          <span style={styles.label}>Refund to:</span> {refundMethod}
        </Text>
      )}
      {expectedBy && (
        <Text style={styles.row}>
          <span style={styles.label}>Expected by:</span> {expectedBy}
        </Text>
      )}
      {reason && (
        <Text style={styles.row}>
          <span style={styles.label}>Reason:</span> {reason}
        </Text>
      )}
    </div>
    <Text style={styles.muted}>
      bKash/Nagad-এ refund সাধারণত 1–3 কর্মদিবসের মধ্যে account-এ চলে আসে।
      না পেলে আমাদের জানান — TrxID সহ verify করে দেব।
    </Text>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'Your refund has been processed',
  displayName: 'Refund processed',
  previewData: {
    name: 'Rahim',
    orderId: 'ANB-104821',
    amount: '350',
    refundMethod: 'bKash 017XXXXXXXX',
    expectedBy: '15 Jun 2026',
    reason: 'Order cancelled by customer',
  },
} satisfies TemplateEntry

export default Email
