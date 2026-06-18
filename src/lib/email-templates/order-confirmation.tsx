import * as React from 'react'
import { Button, Hr, Row, Column, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface Item {
  name: string
  qty?: number
  price?: number | string
}

interface Props {
  name?: string
  orderId?: string
  orderUrl?: string
  items?: Item[]
  subtotal?: number | string
  discount?: number | string
  total?: number | string
  paymentMethod?: string
  estimatedDelivery?: string
}

const fmt = (v?: number | string) =>
  v === undefined || v === null || v === '' ? '—' : typeof v === 'number' ? `৳${v.toLocaleString('en-BD')}` : `৳${v}`

const Email = ({
  name,
  orderId,
  orderUrl = 'https://accessnowbd.com/orders',
  items = [],
  subtotal,
  discount,
  total,
  paymentMethod = 'bKash / Nagad',
  estimatedDelivery = '১৫–৩০ মিনিট',
}: Props) => (
  <EmailLayout
    preview={`Order ${orderId ?? ''} received — we are processing now`}
    heading="Order received ✅"
  >
    <Text style={styles.text}>
      ধন্যবাদ{name ? `, ${name}` : ''}! আপনার order আমরা পেয়েছি এবং payment confirm হওয়ার পর delivery শুরু হবে।
    </Text>

    {orderId && (
      <Text style={styles.muted}>
        Order ID: <strong style={{ color: '#0f172a' }}>{orderId}</strong>
      </Text>
    )}

    <Hr style={styles.hr} />

    {items.map((item, i) => (
      <Row key={i} style={{ marginBottom: 8 }}>
        <Column>
          <Text style={{ ...styles.text, margin: 0 }}>
            {item.name}
            {item.qty ? ` × ${item.qty}` : ''}
          </Text>
        </Column>
        <Column align="right">
          <Text style={{ ...styles.text, margin: 0 }}>{fmt(item.price)}</Text>
        </Column>
      </Row>
    ))}

    {items.length > 0 && <Hr style={styles.hr} />}

    <Row>
      <Column><Text style={{ ...styles.muted, margin: 0 }}>Subtotal</Text></Column>
      <Column align="right"><Text style={{ ...styles.muted, margin: 0 }}>{fmt(subtotal)}</Text></Column>
    </Row>
    {discount !== undefined && discount !== 0 && (
      <Row>
        <Column><Text style={{ ...styles.muted, margin: 0 }}>Discount</Text></Column>
        <Column align="right"><Text style={{ ...styles.muted, margin: 0 }}>− {fmt(discount)}</Text></Column>
      </Row>
    )}
    <Row>
      <Column><Text style={{ ...styles.text, margin: '8px 0 0', fontWeight: 700 }}>Total</Text></Column>
      <Column align="right"><Text style={{ ...styles.text, margin: '8px 0 0', fontWeight: 700 }}>{fmt(total)}</Text></Column>
    </Row>

    <Hr style={styles.hr} />

    <Text style={styles.muted}>Payment method: {paymentMethod}</Text>
    <Text style={styles.muted}>Estimated delivery: {estimatedDelivery}</Text>

    <Button style={styles.button} href={orderUrl}>
      Track your order
    </Button>

    <Text style={styles.muted}>
      Payment screenshot পাঠাতে ভুলবেন না — confirm হলেই আমরা credentials পাঠিয়ে দেবো।
    </Text>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: (data) => `Order ${data?.orderId ? `#${data.orderId} ` : ''}received — AccessNow BD`,
  displayName: 'Order confirmation',
  previewData: {
    name: 'Rahim',
    orderId: 'ANB-10245',
    items: [
      { name: 'Netflix Premium (1 month)', qty: 1, price: 350 },
      { name: 'Spotify Premium (1 month)', qty: 1, price: 180 },
    ],
    subtotal: 530,
    discount: 30,
    total: 500,
    paymentMethod: 'bKash',
  },
} satisfies TemplateEntry

export default Email
