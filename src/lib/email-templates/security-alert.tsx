import * as React from 'react'
import { Button, Hr, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  event?: string
  detail?: string
  ipAddress?: string
  location?: string
  device?: string
  occurredAt?: string
  secureAccountUrl?: string
}

const Email = ({
  name,
  event = 'Unusual activity detected',
  detail = 'We noticed something unusual on your AccessNow BD account.',
  ipAddress,
  location,
  device,
  occurredAt,
  secureAccountUrl = 'https://accessnowbd.com/account/security',
}: Props) => (
  <EmailLayout
    preview={event}
    heading="🛡️ Security alert"
  >
    <Text style={styles.text}>
      Hi{name ? ` ${name}` : ''}, {detail}
    </Text>

    <Hr style={styles.hr} />

    <Text style={styles.muted}>
      <strong style={{ color: '#0f172a' }}>Event:</strong> {event}
    </Text>
    {occurredAt && (
      <Text style={styles.muted}>
        <strong style={{ color: '#0f172a' }}>When:</strong> {occurredAt}
      </Text>
    )}
    {device && (
      <Text style={styles.muted}>
        <strong style={{ color: '#0f172a' }}>Device:</strong> {device}
      </Text>
    )}
    {ipAddress && (
      <Text style={styles.muted}>
        <strong style={{ color: '#0f172a' }}>IP:</strong> {ipAddress}
        {location ? ` · ${location}` : ''}
      </Text>
    )}

    <Hr style={styles.hr} />

    <Text style={styles.text}>
      এটি যদি আপনি না করে থাকেন, এখনই password পরিবর্তন করুন এবং সব device থেকে log out করুন।
    </Text>

    <Button style={styles.button} href={secureAccountUrl}>
      Secure my account
    </Button>

    <Text style={styles.muted}>
      যদি এটি আপনিই করে থাকেন, তবে এই email-কে উপেক্ষা করতে পারেন — কোনো action দরকার নেই।
    </Text>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: (data) => `🛡️ Security alert: ${data?.event ?? 'unusual activity'} — AccessNow BD`,
  displayName: 'Security alert',
  previewData: {
    name: 'Rahim',
    event: 'New login from an unrecognised device',
    detail: 'A new sign-in was detected on your AccessNow BD account.',
    ipAddress: '103.108.224.10',
    location: 'Dhaka, Bangladesh',
    device: 'Chrome on Windows',
    occurredAt: '12 June 2026, 7:42 PM',
  },
} satisfies TemplateEntry

export default Email
