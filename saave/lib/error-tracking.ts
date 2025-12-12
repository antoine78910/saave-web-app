import { inngest } from './inngest';

export interface ErrorContext {
  url?: string;
  userId?: string;
  userAgent?: string;
  environment?: string;
  context?: Record<string, any>;
}

/**
 * Track errors and send them to Inngest for monitoring
 */
export async function trackError(
  error: Error | string,
  context?: ErrorContext
): Promise<void> {
  try {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    await inngest.send({
      name: 'error/track',
      data: {
        error: errorMessage,
        stack: errorStack,
        url: context?.url || (typeof window !== 'undefined' ? window.location.href : undefined),
        userId: context?.userId,
        userAgent: context?.userAgent || (typeof window !== 'undefined' ? window.navigator.userAgent : undefined),
        environment: context?.environment || process.env.NODE_ENV || 'unknown',
        context: context?.context || {},
        timestamp: new Date().toISOString(),
      },
    });

    console.log('📤 Error tracked in Inngest:', errorMessage);
  } catch (trackingError) {
    // Don't fail if error tracking fails
    console.warn('⚠️ Failed to track error in Inngest:', trackingError);
  }
}

/**
 * Track network request failures
 */
export async function trackNetworkError(
  url: string,
  method: string,
  status?: number,
  error?: string,
  context?: Omit<ErrorContext, 'url'>
): Promise<void> {
  await trackError(
    error || `Network request failed: ${method} ${url}${status ? ` → ${status}` : ''}`,
    {
      ...context,
      url,
      context: {
        ...context?.context,
        method,
        status,
        type: 'network_error',
      },
    }
  );
}

