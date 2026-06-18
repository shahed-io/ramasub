import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface InvoiceItem {
  name: string
  qty: number
  price: string
}

interface Props {
  name?: string
  orderId?: string
  invoiceDate?: string
  paymentMethod?: string
  items?: InvoiceItem[]
  subtotal?: string
  discount?: string
  total?: string
  invoiceUrl?: string
}

const Email = ({
  name,
  orderId,
  invoiceDate,
  paymentMethod,
  items = [],
  subtotal,
  discount,
  total,
  invoiceUrl = 'https://accessnowbd.com/orders',
}: Props) => (
  <EmailLayout
    preview={`Invoice ${orderId ?? ''} from AccessNow BD`}
    heading={`Invoice ${orderId ?? ''}`}
  >
    <Text style={styles.text}>
      Hi{name ? ` ${name}` : ''}, আপনার order-এর invoice নিচে দেওয়া হলো।
    </Text>
    <div style={styles.totalBox}>
      {invoiceDate && (
        <Text style={styles.row}>
          <span style={styles.label}>Date:</span> {invoiceDate}
        </Text>
      )}
      {paymentMethod && (
        <Text style={styles.row}>
          <span style={styles.label}>Paid via:</span> {paymentMethod}
        </Text>
      )}
    </div>
    {items.length > 0 && (
      <div style={{ margin: '10px 0 16px' }}>
        {items.map((it, i) => (
          <Text key={i} style={styles.row}>
            {it.name} × {it.qty} — ৳{it.price}
          </Text>
        ))}
      </div>
    )}
    <div style={styles.totalBox}>
      {subtotal && (
        <Text style={styles.row}>
          <span style={styles.label}>Subtotal:</span> ৳{subtotal}
        </Text>
      )}
      {discount && (
        <Text style={styles.row}>
          <span style={styles.label}>Discount:</span> −৳{discount}
        </Text>
      )}
      {total && (
        <Text style={{ ...styles.row, fontWeight: 700, fontSize: '15px' }}>
          <span style={styles.label}>Total paid:</span> ৳{total}
        </Text>
      )}
    </div>
    <Button style={styles.button} href={invoiceUrl}>
      View invoice online
    </Button>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'Your AccessNow BD invoice',
  displayName: 'Invoice email',
  previewData: {
    name: 'Rahim',
    orderId: 'ANB-104821',
    invoiceDate: '12 Jun 2026',
    paymentMethod: 'bKash (8H92K2L1AB)',
    items: [{ name: 'Netflix Premium 1 month', qty: 1, price: '350' }],
    subtotal: '350',
    discount: '0',
    total: '350',
    invoiceUrl: 'https://accessnowbd.com/orders',
  },
} satisfies TemplateEntry

export default Email
