import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { processBookmark, sendNotification, trackError } from '@/lib/inngest-functions';

// Create the Inngest serve handler with all functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processBookmark,
    sendNotification,
    trackError,
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
});

