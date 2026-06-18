import * as React from 'react'
import { Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  changedAt?: string
  ipAddress?: string
}

const Email = ({ name, changedAt, ipAddress }: Props) => (
  <EmailLayout
    preview="Your AccessNow BD password was changed"
    heading="Password changed ✅"
  >
    <Text style={styles.text}>
      Hi{name ? ` ${name}` : ''}, আপনার AccessNow BD account-এর password
      সফলভাবে পরিবর্তন করা হয়েছে।
    </Text>
    {(changedAt || ipAddress) && (
      <div style={styles.totalBox}>
        {changedAt && (
          <Text style={styles.row}>
            <span style={styles.label}>সময়:</span> {changedAt}
          </Text>
        )}
        {ipAddress && (
          <Text style={styles.row}>
            <span style={styles.label}>IP:</span> {ipAddress}
          </Text>
        )}
      </div>
    )}
    <Text style={styles.muted}>
      আপনি যদি এই পরিবর্তন না করে থাকেন, এখনই আমাদের support team-কে জানান এবং
      account secure করুন।
    </Text>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'Your password was changed',
  displayName: 'Password changed alert',
  previewData: { name: 'Rahim', changedAt: '12 Jun 2026, 10:42 PM (BDT)', ipAddress: '103.x.x.x' },
} satisfies TemplateEntry

export default Email
