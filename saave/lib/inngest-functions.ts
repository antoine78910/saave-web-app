import { inngest } from './inngest';

// Example function: Process bookmark
export const processBookmark = inngest.createFunction(
  { id: 'process-bookmark' },
  { event: 'bookmark/process' },
  async ({ event, step }) => {
    console.log('📚 Processing bookmark:', event.data);
    
    // This is a placeholder function
    // You can add your bookmark processing logic here
    const result = await step.run('process-bookmark-step', async () => {
      // Simulate processing
      return { success: true, bookmarkId: event.data.bookmarkId };
    });
    
    return result;
  }
);

// Example function: Send notification
export const sendNotification = inngest.createFunction(
  { id: 'send-notification' },
  { event: 'notification/send' },
  async ({ event, step }) => {
    console.log('📧 Sending notification:', event.data);
    
    // This is a placeholder function
    // You can add your notification logic here
    const result = await step.run('send-notification-step', async () => {
      // Simulate sending notification
      return { success: true, message: 'Notification sent' };
    });
    
    return result;
  }
);

// Export all functions as an array for the serve handler
export const inngestFunctions = [
  processBookmark,
  sendNotification,
];

// Helper function to send events (use this in your code)
export async function sendBookmarkProcessEvent(data: { bookmarkId: string; url: string }) {
  return await inngest.send({
    name: 'bookmark/process',
    data,
  });
}

export async function sendNotificationEvent(data: { userId: string; message: string }) {
  return await inngest.send({
    name: 'notification/send',
    data,
  });
}

