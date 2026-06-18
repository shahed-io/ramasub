import * as React from 'react'
import { Button, Hr, Link, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <EmailLayout
    preview={`You've been invited to join ${siteName}`}
    heading="You're invited 🎉"
  >
    <Text style={styles.text}>
      আপনাকে{' '}
      <Link href={siteUrl} style={{ color: '#0f1b3d', fontWeight: 600 }}>
        {siteName}
      </Link>
      -এ join করার জন্য আমন্ত্রণ জানানো হয়েছে। নিচের button-এ click করে
      invitation accept করুন এবং আপনার account set up করুন।
    </Text>

    <Button style={styles.button} href={confirmationUrl}>
      Accept invitation
    </Button>

    <Hr style={styles.hr} />

    <Text style={styles.muted}>
      Button কাজ না করলে এই link copy করে browser-এ paste করুন:
      <br />
      <Link href={confirmationUrl} style={{ color: '#0f1b3d', wordBreak: 'break-all' }}>
        {confirmationUrl}
      </Link>
    </Text>

    <Text style={styles.muted}>
      আপনি যদি এই invitation expect না করে থাকেন, email-টি নিরাপদে উপেক্ষা করতে
      পারেন।
    </Text>
  </EmailLayout>
)

export default InviteEmail
