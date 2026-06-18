import type { ComponentType } from 'react'

import { template as welcomeTemplate } from './welcome'
import { template as orderConfirmationTemplate } from './order-confirmation'
import { template as orderStatusUpdateTemplate } from './order-status-update'
import { template as subscriptionActivatedTemplate } from './subscription-activated'
import { template as subscriptionCancelledTemplate } from './subscription-cancelled'
import { template as subscriptionExpiringTemplate } from './subscription-expiring'
import { template as paymentSuccessTemplate } from './payment-success'
import { template as paymentFailedTemplate } from './payment-failed'
import { template as refundProcessedTemplate } from './refund-processed'
import { template as invoiceTemplate } from './invoice'
import { template as passwordChangedTemplate } from './password-changed'
import { template as newDeviceLoginTemplate } from './new-device-login'
import { template as securityAlertTemplate } from './security-alert'
import { template as supportTicketReplyTemplate } from './support-ticket-reply'
import { template as supportTicketCreatedTemplate } from './support-ticket-created'
import { template as supportTicketClosedTemplate } from './support-ticket-closed'
import { template as contactConfirmationTemplate } from './contact-confirmation'
import { template as maintenanceNoticeTemplate } from './maintenance-notice'
import { template as systemNotificationTemplate } from './system-notification'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names used by the send route to
 * their React Email component + metadata. Add new templates here after
 * creating the .tsx file in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome': welcomeTemplate,
  'order-confirmation': orderConfirmationTemplate,
  'order-status-update': orderStatusUpdateTemplate,
  'subscription-activated': subscriptionActivatedTemplate,
  'subscription-cancelled': subscriptionCancelledTemplate,
  'subscription-expiring': subscriptionExpiringTemplate,
  'payment-success': paymentSuccessTemplate,
  'payment-failed': paymentFailedTemplate,
  'refund-processed': refundProcessedTemplate,
  'invoice': invoiceTemplate,
  'password-changed': passwordChangedTemplate,
  'new-device-login': newDeviceLoginTemplate,
  'security-alert': securityAlertTemplate,
  'support-ticket-created': supportTicketCreatedTemplate,
  'support-ticket-reply': supportTicketReplyTemplate,
  'support-ticket-closed': supportTicketClosedTemplate,
  'contact-confirmation': contactConfirmationTemplate,
  'maintenance-notice': maintenanceNoticeTemplate,
  'system-notification': systemNotificationTemplate,
}
