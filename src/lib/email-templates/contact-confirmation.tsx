import * as React from 'react'
import { Hr, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  message?: string
  topic?: string
}

const Email = ({ name, message, topic }: Props) => (
  <EmailLayout
    preview="We received your message — AccessNow BD"
    heading="আপনার message পেয়েছি 📨"
  >
    <Text style={styles.text}>
      Hi{name ? ` ${name}` : ''}, যোগাযোগ করার জন্য ধন্যবাদ। আমরা আপনার বার্তা
      পেয়েছি এবং সাধারণত ২৪ ঘণ্টার মধ্যে reply করি।
    </Text>

    {topic && (
      <Text style={styles.muted}>
        Topic: <strong style={{ color: '#0f172a' }}>{topic}</strong>
      </Text>
    )}

    {message && (
      <>
        <Hr style={styles.hr} />
        <Text style={styles.muted}>আপনার পাঠানো বার্তা:</Text>
        <Text style={{ ...styles.text, whiteSpace: 'pre-wrap' }}>{message}</Text>
      </>
    )}

    <Hr style={styles.hr} />

    <Text style={styles.muted}>
      জরুরি হলে WhatsApp-এ মেসেজ দিন — আমরা দ্রুত reply দেব।
    </Text>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'We received your message — AccessNow BD',
  displayName: 'Contact form confirmation',
  previewData: {
    name: 'Karim',
    topic: 'Subscription pricing',
    message: 'YouTube Premium-এর family plan-এর দাম কত?',
  },
} satisfies TemplateEntry

export default Email
