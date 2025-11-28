import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { processBookmark, sendNotification } from '@/lib/inngest-functions';

// Create the Inngest serve handler with all functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processBookmark,
    sendNotification,
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
});

