import * as React from 'react'
import { Button, Hr, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  ticketId?: string
  subject?: string
  agentName?: string
  message?: string
  ticketUrl?: string
}

const Email = ({
  name,
  ticketId,
  subject = 'your support request',
  agentName = 'AccessNow BD Support',
  message = 'We have an update on your ticket. Please open it to see the full reply.',
  ticketUrl = 'https://accessnowbd.com/support',
}: Props) => (
  <EmailLayout
    preview={`New reply on ${subject}`}
    heading="New reply from support 💬"
  >
    <Text style={styles.text}>
      Hi{name ? ` ${name}` : ''}, {agentName} আপনার support ticket-এ reply করেছে।
    </Text>

    {ticketId && (
      <Text style={styles.muted}>
        Ticket ID: <strong style={{ color: '#0f172a' }}>{ticketId}</strong>
        {subject && <> · {subject}</>}
      </Text>
    )}

    <Hr style={styles.hr} />

    <Text style={{ ...styles.text, whiteSpace: 'pre-wrap' }}>{message}</Text>

    <Hr style={styles.hr} />

    <Button style={styles.button} href={ticketUrl}>
      View ticket &amp; reply
    </Button>

    <Text style={styles.muted}>
      এই email-এ reply করলে আপনার ticket-এ message যোগ হবে না — উপরের button দিয়ে dashboard থেকে reply করুন।
    </Text>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: (data) => `Re: ${data?.subject ?? 'your support request'} — AccessNow BD`,
  displayName: 'Support ticket reply',
  previewData: {
    name: 'Rahim',
    ticketId: 'T-4821',
    subject: 'Netflix login not working',
    agentName: 'Tanvir (Support)',
    message:
      'আমরা আপনার account check করেছি। নতুন credentials পাঠিয়ে দিয়েছি — login করে দেখুন এবং সমস্যা থাকলে জানান।',
  },
} satisfies TemplateEntry

export default Email
