import * as React from 'react'
import { Button, Hr, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  ticketId?: string
  subject?: string
  resolution?: string
  ticketUrl?: string
}

const Email = ({
  name,
  ticketId,
  subject = 'your support request',
  resolution,
  ticketUrl = 'https://accessnowbd.com/support',
}: Props) => (
  <EmailLayout
    preview={`Ticket closed: ${subject}`}
    heading="আপনার ticket close করা হয়েছে ✅"
  >
    <Text style={styles.text}>
      Hi{name ? ` ${name}` : ''}, আপনার support ticket close করা হয়েছে। যদি সমস্যা
      আবার দেখা দেয়, dashboard থেকে আবার reply করলে ticket পুনরায় open হবে।
    </Text>

    {ticketId && (
      <Text style={styles.muted}>
        Ticket ID: <strong style={{ color: '#0f172a' }}>{ticketId}</strong>
        {subject && <> · {subject}</>}
      </Text>
    )}

    {resolution && (
      <>
        <Hr style={styles.hr} />
        <Text style={styles.muted}>সমাধান / final note:</Text>
        <Text style={{ ...styles.text, whiteSpace: 'pre-wrap' }}>{resolution}</Text>
      </>
    )}

    <Hr style={styles.hr} />

    <Button style={styles.button} href={ticketUrl}>
      View ticket
    </Button>

    <Text style={styles.muted}>
      আমাদের service কেমন ছিল? Reply করে জানালে আমরা আরও ভালো হতে পারব।
    </Text>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: (data) => `[Ticket ${data?.ticketId ?? ''}] Closed — ${data?.subject ?? 'your request'}`,
  displayName: 'Support ticket closed',
  previewData: {
    name: 'Rahim',
    ticketId: 'T-4821',
    subject: 'Netflix login not working',
    resolution: 'নতুন credentials পাঠানো হয়েছে এবং আপনি confirm করেছেন যে login হচ্ছে। ধন্যবাদ!',
  },
} satisfies TemplateEntry

export default Email
