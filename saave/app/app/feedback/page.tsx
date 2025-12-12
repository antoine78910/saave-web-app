'use client';

import FeedbackWidget from '@/components/FeedbackWidget';

export default function FeedbackPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Feature Requests & Feedback</h1>
      <div className="bg-background rounded-lg shadow-sm min-h-[600px]">
        <FeedbackWidget />
      </div>
    </div>
  );
}

