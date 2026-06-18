import * as React from 'react'
import { Button, Hr, Link, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <EmailLayout
    preview={`Confirm your email change for ${siteName}`}
    heading="Confirm your email change ✉️"
  >
    <Text style={styles.text}>
      আপনি {siteName} account-এর email পরিবর্তনের request করেছেন।
    </Text>

    <Text style={styles.row}>
      <span style={styles.label}>From:</span>
      <strong style={{ color: '#0f172a' }}>{oldEmail}</strong>
    </Text>
    <Text style={styles.row}>
      <span style={styles.label}>To:</span>
      <strong style={{ color: '#0f172a' }}>{newEmail}</strong>
    </Text>

    <Hr style={styles.hr} />

    <Text style={styles.text}>
      পরিবর্তনটি confirm করতে নিচের button-এ click করুন।
    </Text>

    <Button style={styles.button} href={confirmationUrl}>
      Confirm email change
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
      ⚠️ আপনি যদি এই পরিবর্তন request না করে থাকেন, এখনই আপনার password change
      করুন এবং আমাদের support team-কে জানান।
    </Text>
  </EmailLayout>
)

export default EmailChangeEmail
