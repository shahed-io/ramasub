import * as React from 'react'
import { Button, Hr, Link, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <EmailLayout
    preview={`Confirm your email to activate your ${siteName} account`}
    heading="Welcome — confirm your email ✉️"
  >
    <Text style={styles.text}>
      Thanks for joining{' '}
      <Link href={siteUrl} style={{ color: '#0f1b3d', fontWeight: 600 }}>
        {siteName}
      </Link>
      . একটিমাত্র step বাকি — নিচের button-এ click করে আপনার email
      ({recipient}) verify করুন।
    </Text>

    <Button style={styles.button} href={confirmationUrl}>
      Verify email address
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
      যদি আপনি account তৈরি না করে থাকেন, এই email নিরাপদে উপেক্ষা করুন — কোনো
      account create হবে না।
    </Text>
  </EmailLayout>
)

export default SignupEmail
