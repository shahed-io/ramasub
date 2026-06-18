import * as React from 'react'
import { Button, Hr, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  title?: string
  message?: string
  ctaLabel?: string
  ctaUrl?: string
}

const Email = ({
  name,
  title = 'System notification',
  message = 'You have a new system notification.',
  ctaLabel,
  ctaUrl,
}: Props) => (
  <EmailLayout
    preview={title}
    heading={title}
  >
    <Text style={styles.text}>Hi{name ? ` ${name}` : ''},</Text>

    <Text style={{ ...styles.text, whiteSpace: 'pre-wrap' }}>{message}</Text>

    {ctaLabel && ctaUrl && (
      <>
        <Hr style={styles.hr} />
        <Button style={styles.button} href={ctaUrl}>
          {ctaLabel}
        </Button>
      </>
    )}
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: (data) => data?.title ?? 'System notification — AccessNow BD',
  displayName: 'System notification (generic)',
  previewData: {
    name: 'Karim',
    title: 'Your account settings were updated',
    message: 'আপনার phone number সফলভাবে update হয়েছে। যদি এটা আপনি না করে থাকেন, এখনই password পরিবর্তন করুন।',
    ctaLabel: 'Open dashboard',
    ctaUrl: 'https://accessnowbd.com/dashboard',
  },
} satisfies TemplateEntry

export default Email
