import * as React from 'react'
import { Button, Hr, Link, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <EmailLayout
    preview={`Your secure sign-in link for ${siteName}`}
    heading="Your sign-in link 🔐"
  >
    <Text style={styles.text}>
      Password ছাড়াই {siteName}-এ login করতে নিচের button-এ click করুন। নিরাপত্তার
      জন্য এই link কিছুক্ষণের মধ্যে expire হবে এবং শুধু একবার ব্যবহার করা যাবে।
    </Text>

    <Button style={styles.button} href={confirmationUrl}>
      Sign in to {siteName}
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
      আপনি যদি এই sign-in request না করে থাকেন, কারো কাছে এই link share করবেন না
      — শুধু email-টি delete করে দিন।
    </Text>
  </EmailLayout>
)

export default MagicLinkEmail
