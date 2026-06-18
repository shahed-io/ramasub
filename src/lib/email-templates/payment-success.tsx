import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  orderId?: string
  amount?: string
  paymentMethod?: string
  transactionId?: string
  paidAt?: string
  orderUrl?: string
}

const Email = ({
  name,
  orderId,
  amount,
  paymentMethod,
  transactionId,
  paidAt,
  orderUrl = 'https://accessnowbd.com/orders',
}: Props) => (
  <EmailLayout
    preview={`Payment received for order ${orderId ?? ''}`}
    heading="Payment received ✅"
  >
    <Text style={styles.text}>
      Hi{name ? ` ${name}` : ''}, আপনার payment সফলভাবে গ্রহণ করা হয়েছে। ধন্যবাদ
      AccessNow BD-তে অর্ডার দেওয়ার জন্য।
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
      {paymentMethod && (
        <Text style={styles.row}>
          <span style={styles.label}>Method:</span> {paymentMethod}
        </Text>
      )}
      {transactionId && (
        <Text style={styles.row}>
          <span style={styles.label}>TrxID:</span> {transactionId}
        </Text>
      )}
      {paidAt && (
        <Text style={styles.row}>
          <span style={styles.label}>সময়:</span> {paidAt}
        </Text>
      )}
    </div>
    <Button style={styles.button} href={orderUrl}>
      View order
    </Button>
    <Text style={styles.muted}>
      আমরা এখন আপনার subscription activate করছি — সাধারণত ১৫–৩০ মিনিটের মধ্যে delivery হয়ে যাবে।
    </Text>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'Payment received — order confirmed ✅',
  displayName: 'Payment success',
  previewData: {
    name: 'Rahim',
    orderId: 'ANB-104821',
    amount: '350',
    paymentMethod: 'bKash',
    transactionId: '8H92K2L1AB',
    paidAt: '12 Jun 2026, 10:42 PM',
    orderUrl: 'https://accessnowbd.com/orders',
  },
} satisfies TemplateEntry

export default Email
