import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  planName?: string
  expiresOn?: string
  daysLeft?: number
  renewUrl?: string
  aiBody?: string
  couponCode?: string
  couponDiscount?: number
  couponValidDays?: number
  couponOfferText?: string
}

const Email = ({
  name,
  planName,
  expiresOn,
  daysLeft,
  renewUrl = 'https://accessnowbd.com/products',
  aiBody,
  couponCode,
  couponDiscount,
  couponValidDays,
  couponOfferText,
}: Props) => (
  <EmailLayout
    preview={`Your ${planName ?? 'subscription'} expires soon`}
    heading="Subscription expiring soon ⏰"
  >
    {aiBody ? (
      aiBody.split(/\n{2,}/).map((para, i) => (
        <Text key={i} style={styles.text}>
          {para.split('\n').map((line, j) => (
            <React.Fragment key={j}>
              {j > 0 && <br />}
              {line}
            </React.Fragment>
          ))}
        </Text>
      ))
    ) : (
      <>
        <Text style={styles.text}>
          Hi{name ? ` ${name}` : ''}, আপনার {planName ?? 'subscription'}-এর মেয়াদ
          {typeof daysLeft === 'number' ? ` মাত্র ${daysLeft} দিনের` : ' শীঘ্রই'} মধ্যে শেষ হয়ে যাচ্ছে।
        </Text>
        {expiresOn && (
          <div style={styles.totalBox}>
            <Text style={styles.row}>
              <span style={styles.label}>Expires on:</span> {expiresOn}
            </Text>
          </div>
        )}
        <Text style={styles.text}>
          service চালু রাখতে এখনই renew করুন — bKash বা Nagad দিয়ে এক ক্লিকে।
        </Text>
      </>
    )}

    {couponCode && (
      <div style={styles.totalBox}>
        <Text style={styles.row}>
          <span style={styles.label}>Your coupon:</span>{' '}
          <strong>{couponCode}</strong> — {couponDiscount ?? 0}% off
          {couponValidDays ? `, valid for ${couponValidDays} days` : ''}
        </Text>
        {couponOfferText && <Text style={styles.muted}>{couponOfferText}</Text>}
      </div>
    )}

    <Button style={styles.button} href={renewUrl}>
      Renew now
    </Button>
    <Text style={styles.muted}>
      Renew না করলে expiry-র পর service automatic বন্ধ হয়ে যাবে।
    </Text>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'Your subscription is expiring soon ⏰',
  displayName: 'Subscription expiring',
  previewData: {
    name: 'Rahim',
    planName: 'Netflix Premium',
    expiresOn: '15 Jun 2026',
    daysLeft: 3,
    renewUrl: 'https://accessnowbd.com/products',
  },
} satisfies TemplateEntry

export default Email
