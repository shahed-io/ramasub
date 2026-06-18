import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  orderId?: string
  amount?: string
  reason?: string
  retryUrl?: string
}

const Email = ({
  name,
  orderId,
  amount,
  reason,
  retryUrl = 'https://accessnowbd.com/cart',
}: Props) => (
  <EmailLayout
    preview={`Payment failed for order ${orderId ?? ''}`}
    heading="Payment failed ⚠️"
  >
    <Text style={styles.text}>
      Hi{name ? ` ${name}` : ''}, দুঃখিত — আপনার payment process করতে আমরা ব্যর্থ হয়েছি।
    </Text>
    <div style={styles.totalBox}>
      {orderId && (
        <Text style={styles.row}>
          <span style={styles.label}>Order ID:</span> {orderId}
        </Text>
      )}
      {amount && (
        <Text style={styles.row}>
          <span style={styles.label}>Amount:</span> ৳{amount}
        </Text>
      )}
      {reason && (
        <Text style={styles.row}>
          <span style={styles.label}>Reason:</span> {reason}
        </Text>
      )}
    </div>
    <Text style={styles.text}>
      চিন্তা করবেন না — কোনো টাকা কাটেনি অথবা refund হয়ে যাবে। আবার চেষ্টা করতে নিচের
      button-এ click করুন।
    </Text>
    <Button style={styles.button} href={retryUrl}>
      Retry payment
    </Button>
    <Text style={styles.muted}>
      বারবার সমস্যা হলে WhatsApp-এ আমাদের জানান — আমরা manual ভাবে confirm করে দেব।
    </Text>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'Payment failed — please try again',
  displayName: 'Payment failed',
  previewData: {
    name: 'Rahim',
    orderId: 'ANB-104821',
    amount: '350',
    reason: 'bKash transaction ID could not be verified',
    retryUrl: 'https://accessnowbd.com/cart',
  },
} satisfies TemplateEntry

export default Email
