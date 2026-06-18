import * as React from 'react'
import { Hr, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  startsAt?: string
  endsAt?: string
  durationMinutes?: number
  affected?: string
  reason?: string
}

const Email = ({
  name,
  startsAt = 'TBA',
  endsAt,
  durationMinutes,
  affected = 'AccessNow BD dashboard',
  reason = 'system upgrade and performance improvements',
}: Props) => (
  <EmailLayout
    preview={`Scheduled maintenance starts ${startsAt}`}
    heading="Scheduled maintenance notice 🛠️"
  >
    <Text style={styles.text}>
      Hi{name ? ` ${name}` : ''}, আমরা একটি scheduled maintenance চালাব। নিচের
      সময়ে কিছু service সাময়িকভাবে অনুপলব্ধ থাকতে পারে।
    </Text>

    <Hr style={styles.hr} />

    <Text style={styles.row}>
      <span style={styles.label}>Starts:</span>
      <strong style={{ color: '#0f172a' }}>{startsAt}</strong>
    </Text>
    {endsAt && (
      <Text style={styles.row}>
        <span style={styles.label}>Ends:</span>
        <strong style={{ color: '#0f172a' }}>{endsAt}</strong>
      </Text>
    )}
    {durationMinutes && (
      <Text style={styles.row}>
        <span style={styles.label}>Expected duration:</span>
        <strong style={{ color: '#0f172a' }}>~{durationMinutes} minutes</strong>
      </Text>
    )}
    <Text style={styles.row}>
      <span style={styles.label}>Affected:</span>
      <strong style={{ color: '#0f172a' }}>{affected}</strong>
    </Text>

    <Hr style={styles.hr} />

    <Text style={styles.text}>
      <strong>কারণ:</strong> {reason}
    </Text>

    <Text style={styles.muted}>
      এই সময়ে login বা order place করতে সমস্যা হতে পারে। অসুবিধার জন্য দুঃখিত —
      ধন্যবাদ ধৈর্য ধরে থাকার জন্য।
    </Text>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: (data) => `Scheduled maintenance — ${data?.startsAt ?? 'soon'}`,
  displayName: 'Maintenance notice',
  previewData: {
    name: 'Rahim',
    startsAt: '15 Jun 2026, 2:00 AM BST',
    endsAt: '15 Jun 2026, 3:30 AM BST',
    durationMinutes: 90,
    affected: 'Dashboard, checkout, login',
    reason: 'Database upgrade for faster order processing.',
  },
} satisfies TemplateEntry

export default Email
