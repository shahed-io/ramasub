import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  orderId?: string
  status?: string
  note?: string
  orderUrl?: string
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending — payment review চলছে',
  processing: 'Processing — delivery prepare হচ্ছে',
  completed: 'Completed ✅ — delivery সম্পন্ন',
  cancelled: 'Cancelled — order বাতিল হয়েছে',
  refunded: 'Refunded — টাকা ফেরত দেওয়া হয়েছে',
}

const Email = ({
  name,
  orderId,
  status = 'pending',
  note,
  orderUrl = 'https://accessnowbd.com/orders',
}: Props) => (
  <EmailLayout
    preview={`Order ${orderId ?? ''} status: ${status}`}
    heading="Order status update"
  >
    <Text style={styles.text}>
      Hi{name ? ` ${name}` : ''}, আপনার order-এর status update হয়েছে।
    </Text>
    <div style={styles.totalBox}>
      {orderId && (
        <Text style={styles.row}>
          <span style={styles.label}>Order ID:</span> {orderId}
        </Text>
      )}
      <Text style={styles.row}>
        <span style={styles.label}>Status:</span>{' '}
        {STATUS_LABEL[status] ?? status}
      </Text>
      {note && (
        <Text style={styles.row}>
          <span style={styles.label}>Note:</span> {note}
        </Text>
      )}
    </div>
    <Button style={styles.button} href={orderUrl}>
      View order
    </Button>
    <Text style={styles.muted}>
      কোনো প্রশ্ন থাকলে WhatsApp-এ আমাদের সাথে যোগাযোগ করুন।
    </Text>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: ({ orderId, status }: Props) =>
    `Order ${orderId ?? ''} — ${status ?? 'updated'}`.trim(),
  displayName: 'Order status update',
  previewData: {
    name: 'Rahim',
    orderId: 'ANB-12AB34CD',
    status: 'processing',
    note: 'Payment confirmed, delivery prepare হচ্ছে।',
    orderUrl: 'https://accessnowbd.com/orders',
  },
} satisfies TemplateEntry

export default Email
