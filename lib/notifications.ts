import { NotificationType } from '@/types';

/**
 * Helper function to create a notification by calling the internal API
 * @param userId - The user ID to send notification to
 * @param type - Type of notification
 * @param title - Notification title
 * @param message - Notification message
 * @param link - Optional link to navigate to when clicked
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string
): Promise<void> {
  try {
    // Use relative URL for internal API call
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        type,
        title,
        message,
        link,
      }),
    });

    if (!response.ok) {
      console.error('Failed to create notification:', await response.text());
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

/**
 * Get a default title for a notification type
 */
export function getNotificationTitle(type: NotificationType): string {
  const titles: Record<NotificationType, string> = {
    proposal_submitted: 'New Proposal Received',
    proposal_accepted: 'Your Proposal Was Accepted!',
    payment_received: 'Payment Received',
    delivery_uploaded: 'New Delivery Available',
    review_submitted: 'New Review Posted',
    message_received: 'New Message',
  };
  return titles[type] || 'Notification';
}

/**
 * Get a formatted notification message
 * @param type - Type of notification
 * @param data - Additional data for message formatting
 */
export function getNotificationMessage(
  type: NotificationType,
  data?: Record<string, any>
): string {
  switch (type) {
    case 'proposal_submitted':
      return data?.creatorName
        ? `${data.creatorName} submitted a proposal for "${data.briefTitle}"`
        : 'A new proposal has been submitted for your brief';
    
    case 'proposal_accepted':
      return data?.briefTitle
        ? `Your proposal for "${data.briefTitle}" has been accepted`
        : 'Your proposal has been accepted';
    
    case 'payment_received':
      return data?.amount
        ? `You received a payment of ${data.amount}`
        : 'You received a new payment';
    
    case 'delivery_uploaded':
      return data?.projectTitle
        ? `New delivery uploaded for "${data.projectTitle}"`
        : 'A new delivery has been uploaded';
    
    case 'review_submitted':
      return data?.rating
        ? `You received a ${data.rating}-star review`
        : 'A new review has been posted';
    
    case 'message_received':
      return data?.senderName
        ? `${data.senderName} sent you a message`
        : 'You have a new message';
    
    default:
      return 'You have a new notification';
  }
}
