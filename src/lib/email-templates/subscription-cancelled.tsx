import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { EmailLayout, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  planName?: string
  cancelledOn?: string
  accessUntil?: string
  reactivateUrl?: string
}

const Email = ({
  name,
  planName,
  cancelledOn,
  accessUntil,
  reactivateUrl = 'https://accessnowbd.com/products',
}: Props) => (
  <EmailLayout
    preview={`Your ${planName ?? 'subscription'} was cancelled`}
    heading="Subscription cancelled"
  >
    <Text style={styles.text}>
      Hi{name ? ` ${name}` : ''}, আপনার {planName ?? 'subscription'} সফলভাবে
      cancel করা হয়েছে।
    </Text>
    <div style={styles.totalBox}>
      {cancelledOn && (
        <Text style={styles.row}>
          <span style={styles.label}>Cancelled on:</span> {cancelledOn}
        </Text>
      )}
      {accessUntil && (
        <Text style={styles.row}>
          <span style={styles.label}>Access until:</span> {accessUntil}
        </Text>
      )}
    </div>
    <Text style={styles.text}>
      ভুল করে cancel হলে চিন্তা করবেন না — যেকোনো সময় আবার subscribe করতে পারবেন।
    </Text>
    <Button style={styles.button} href={reactivateUrl}>
      Reactivate subscription
    </Button>
    <Text style={styles.muted}>
      আপনার feedback পেলে আমরা service আরও ভালো করতে পারব। ধন্যবাদ AccessNow BD-এর সাথে থাকার জন্য।
    </Text>
  </EmailLayout>
)

export const template = {
  component: Email,
  subject: 'Your subscription has been cancelled',
  displayName: 'Subscription cancelled',
  previewData: {
    name: 'Rahim',
    planName: 'Netflix Premium',
    cancelledOn: '12 Jun 2026',
    accessUntil: '15 Jun 2026',
    reactivateUrl: 'https://accessnowbd.com/products',
  },
} satisfies TemplateEntry

export default Email
