"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";

// Dynamically import components to avoid SSR issues
const TranscriptProvider = dynamic(
  () => import("@/app/contexts/TranscriptContext").then(mod => ({ default: mod.TranscriptProvider })),
  { ssr: false }
);

const EventProvider = dynamic(
  () => import("@/app/contexts/EventContext").then(mod => ({ default: mod.EventProvider })),
  { ssr: false }
);

const App = dynamic(() => import("./App"), { ssr: false });

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TranscriptProvider>
        <EventProvider>
          <App />
        </EventProvider>
      </TranscriptProvider>
    </Suspense>
  );
}