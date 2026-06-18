import * as React from 'react'
import { Hr, Section, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EmailLayout
    preview="Your AccessNow BD verification code"
    heading="Your verification code 🔐"
  >
    <Text style={styles.text}>
      আপনার identity confirm করতে নিচের 6-digit code-টি ব্যবহার করুন।
    </Text>

    <Section style={codeBox}>
      <Text style={codeStyle}>{token}</Text>
    </Section>

    <Hr style={styles.hr} />

    <Text style={styles.muted}>
      এই code কিছুক্ষণের মধ্যে expire হবে এবং শুধু একবার ব্যবহার করা যাবে।
      নিরাপত্তার জন্য এই code কাউকে — even our support team-কেও — share করবেন
      না।
    </Text>

    <Text style={styles.muted}>
      আপনি যদি এই request না করে থাকেন, email-টি উপেক্ষা করুন এবং প্রয়োজনে
      password change করুন।
    </Text>
  </EmailLayout>
)

export default ReauthenticationEmail

const codeBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '18px 16px',
  textAlign: 'center' as const,
  margin: '16px 0 8px',
}
const codeStyle = {
  fontFamily: '"Courier New", Courier, monospace',
  fontSize: '32px',
  fontWeight: 700 as const,
  color: '#0f1b3d',
  letterSpacing: '10px',
  margin: 0,
}
