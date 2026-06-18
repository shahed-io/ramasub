import * as React from 'react'
import { Button, Hr, Link, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <EmailLayout
    preview={`Reset your ${siteName} password`}
    heading="Reset your password 🔑"
  >
    <Text style={styles.text}>
      আমরা আপনার {siteName} account-এর জন্য password reset-এর request পেয়েছি।
      নতুন password set করতে নিচের button-এ click করুন।
    </Text>

    <Button style={styles.button} href={confirmationUrl}>
      Choose a new password
    </Button>

    <Hr style={styles.hr} />

    <Text style={styles.muted}>
      নিরাপত্তার জন্য এই link কিছুক্ষণের মধ্যে expire হবে। Button কাজ না করলে এই
      link copy করে browser-এ paste করুন:
      <br />
      <Link href={confirmationUrl} style={{ color: '#0f1b3d', wordBreak: 'break-all' }}>
        {confirmationUrl}
      </Link>
    </Text>

    <Text style={styles.muted}>
      আপনি যদি password reset request না করে থাকেন, এই email উপেক্ষা করুন —
      আপনার password অপরিবর্তিত থাকবে। কেউ বারবার চেষ্টা করছে মনে হলে আমাদের
      support team-কে জানান।
    </Text>
  </EmailLayout>
)

export default RecoveryEmail
