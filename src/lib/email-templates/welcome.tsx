import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  dashboardUrl?: string
}

const Email = ({ name, dashboardUrl = 'https://accessnowbd.com' }: Props) => (
  <EmailLayout
    preview={`Welcome to AccessNow BD${name ? `, ${name}` : ''}!`}
    heading={`Welcome${name ? `, ${name}` : ''}! 🎉`}
  >
    <Text style={styles.text}>
      AccessNow BD-তে স্বাগতম! আপনার account তৈরি হয়েছে এবং আপনি এখন আমাদের সব
      digital subscription, AI tools এবং education service ব্যবহার করতে পারবেন।
    </Text>
    <Text style={styles.text}>
      bKash বা Nagad দিয়ে সহজেই Netflix, Spotify, ChatGPT-সহ সব premium service কিনতে পারবেন —
      ১৫–৩০ মিনিটে instant delivery।
    </Text>
    <Button style={styles.button} href={dashboardUrl}>
      Browse services
    </Button>
    <Text style={styles.muted}>
      কোনো প্রশ্ন থাকলে আমাদের support team সবসময় WhatsApp-এ আছে।
    </Text>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'Welcome to AccessNow BD 🎉',
  displayName: 'Welcome email',
  previewData: { name: 'Rahim', dashboardUrl: 'https://accessnowbd.com' },
} satisfies TemplateEntry

export default Email
