import { inngest } from './inngest';

// Example function: Process bookmark
export const processBookmark = inngest.createFunction(
  { id: 'process-bookmark' },
  { event: 'bookmark/process' },
  async ({ event, step }) => {
    // This is a placeholder function
    // You can add your bookmark processing logic here
    return { success: true, bookmarkId: event.data.bookmarkId };
  }
);

// Example function: Send notification
export const sendNotification = inngest.createFunction(
  { id: 'send-notification' },
  { event: 'notification/send' },
  async ({ event, step }) => {
    // This is a placeholder function
    // You can add your notification logic here
    return { success: true, message: 'Notification sent' };
  }
);

// Export all functions as an array for the serve handler
export const inngestFunctions = [
  processBookmark,
  sendNotification,
];

