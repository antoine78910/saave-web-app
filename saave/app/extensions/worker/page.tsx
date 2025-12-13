import { Suspense } from 'react';
import ExtensionWorkerClient from './worker-client';

export default function ExtensionWorkerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#181a1b]" />}>
      <ExtensionWorkerClient />
    </Suspense>
  );
}


