import * as React from 'react'
import { Button, Hr, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  ticketId?: string
  subject?: string
  message?: string
  ticketUrl?: string
}

const Email = ({
  name,
  ticketId,
  subject = 'your support request',
  message,
  ticketUrl = 'https://accessnowbd.com/support',
}: Props) => (
  <EmailLayout
    preview={`We've received your ticket: ${subject}`}
    heading="আপনার ticket জমা পড়েছে ✅"
  >
    <Text style={styles.text}>
      Hi{name ? ` ${name}` : ''}, আপনার support ticket আমরা পেয়েছি। আমাদের team
      যত দ্রুত সম্ভব reply করবে — সাধারণত ২৪ ঘণ্টার মধ্যে।
    </Text>

    {ticketId && (
      <Text style={styles.muted}>
        Ticket ID: <strong style={{ color: '#0f172a' }}>{ticketId}</strong>
        {subject && <> · {subject}</>}
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

    <Button style={styles.button} href={ticketUrl}>
      View ticket
    </Button>

    <Text style={styles.muted}>
      Reply এলে আপনি email ও dashboard-এ notification পাবেন।
    </Text>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: (data) => `[Ticket ${data?.ticketId ?? ''}] We received your request — AccessNow BD`,
  displayName: 'Support ticket created',
  previewData: {
    name: 'Rahim',
    ticketId: 'T-4821',
    subject: 'Netflix login not working',
    message: 'গতকাল থেকে login করতে পারছি না — password reset করেছি, তাও হচ্ছে না।',
  },
} satisfies TemplateEntry

export default Email
