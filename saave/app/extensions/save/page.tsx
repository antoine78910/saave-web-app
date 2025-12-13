import { Suspense } from 'react';
import ExtensionSaveClient from './save-client';

export default function ExtensionSavePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#181a1b]" />}>
      <ExtensionSaveClient />
    </Suspense>
  );
}


