import * as React from 'react'
import { Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  device?: string
  location?: string
  ipAddress?: string
  signedInAt?: string
}

const Email = ({ name, device, location, ipAddress, signedInAt }: Props) => (
  <EmailLayout
    preview="New device sign-in to your AccessNow BD account"
    heading="New device login 🔔"
  >
    <Text style={styles.text}>
      Hi{name ? ` ${name}` : ''}, আমরা detect করেছি যে একটা নতুন device থেকে
      আপনার AccessNow BD account-এ login হয়েছে।
    </Text>
    <div style={styles.totalBox}>
      {device && (
        <Text style={styles.row}>
          <span style={styles.label}>Device:</span> {device}
        </Text>
      )}
      {location && (
        <Text style={styles.row}>
          <span style={styles.label}>Location:</span> {location}
        </Text>
      )}
      {ipAddress && (
        <Text style={styles.row}>
          <span style={styles.label}>IP:</span> {ipAddress}
        </Text>
      )}
      {signedInAt && (
        <Text style={styles.row}>
          <span style={styles.label}>সময়:</span> {signedInAt}
        </Text>
      )}
    </div>
    <Text style={styles.muted}>
      আপনি নিজে login করে থাকলে কিছু করার দরকার নেই। চিনতে না পারলে এখনই password
      পরিবর্তন করুন এবং আমাদের জানান।
    </Text>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'New device login on your account',
  displayName: 'New device login alert',
  previewData: {
    name: 'Rahim',
    device: 'Chrome on Windows',
    location: 'Dhaka, Bangladesh',
    ipAddress: '103.x.x.x',
    signedInAt: '12 Jun 2026, 11:05 PM (BDT)',
  },
} satisfies TemplateEntry

export default Email
