import * as React from 'react'
import { Button, Text, Link } from '@react-email/components'
import { EmailLayout, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface DownloadItem {
  label?: string
  url?: string
  product?: string
  productSlug?: string
  platform?: string
  version?: string
  size?: string
  notes?: string
}

interface Props {
  name?: string
  orderId?: string
  downloads?: DownloadItem[]
}

const Email = ({ name, orderId, downloads = [] }: Props) => (
  <EmailLayout
    preview="Your download links are ready 📥"
    heading="Your downloads are ready 📥"
  >
    <Text style={styles.text}>
      Hi{name ? ` ${name}` : ''}, ধন্যবাদ! আপনার order-এর download link প্রস্তুত। নিচের link গুলো থেকে software download করে নিন।
    </Text>

    {orderId && (
      <Text style={styles.muted}>
        Order ID: <strong>{orderId.slice(0, 8).toUpperCase()}</strong>
      </Text>
    )}

    <div style={styles.totalBox}>
      {downloads.map((d, i) => (
        <div key={i} style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: i === downloads.length - 1 ? 'none' : '1px solid #e5e7eb' }}>
          <Text style={styles.row}>
            <strong>{d.product || d.label || `File ${i + 1}`}</strong>
            {d.platform ? ` · ${d.platform}` : ''}
            {d.version ? ` · v${d.version}` : ''}
            {d.size ? ` · ${d.size}` : ''}
          </Text>
          {d.label && d.product && d.label !== d.product && (
            <Text style={styles.muted}>{d.label}</Text>
          )}
          {d.url && (
            <Text style={{ margin: '6px 0' }}>
              <Link href={d.url} style={{ color: '#7c3aed', wordBreak: 'break-all' }}>{d.url}</Link>
            </Text>
          )}
          {d.notes && <Text style={styles.muted}>{d.notes}</Text>}
        </div>
      ))}
    </div>

    <Button style={styles.button} href={`https://ramasub.com/dashboard`}>
      View in dashboard
    </Button>

    <Text style={styles.muted}>
      Link কাজ না করলে WhatsApp-এ আমাদের জানান — আমরা সাথে সাথে সাহায্য করব।
    </Text>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'Your download links are ready 📥',
  displayName: 'Software download ready',
  previewData: {
    name: 'Rahim',
    orderId: 'ab12cd34-ef56-7890-abcd-ef1234567890',
    downloads: [
      { product: 'Adobe Creative Cloud', label: 'Setup', platform: 'Windows', version: '2026.1', size: '2.4 GB', url: 'https://example.com/adobe.exe' },
      { product: 'Office 365', label: 'Installer', platform: 'macOS', size: '1.1 GB', url: 'https://example.com/office.dmg' },
    ],
  },
} satisfies TemplateEntry

export default Email
