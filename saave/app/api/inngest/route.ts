import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';

// Create the Inngest serve handler
export const { GET, POST, PUT } = serve({
  client: inngest,
  signingKey: process.env.INNGEST_SIGNING_KEY,
});

