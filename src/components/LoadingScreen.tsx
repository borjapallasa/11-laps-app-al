"use client";
import React from "react";

type LoadingScreenProps = {
  error?: string | null;
};

/**
 * LoadingScreen component
 * Shows while waiting for INIT message from parent app
 * Shows error if timeout or initialization fails
 */
export function LoadingScreen({ error }: LoadingScreenProps) {
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-md p-8">
          <div className="mb-4">
            <svg
              className="w-16 h-16 text-error mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-big font-big text-foreground mb-2">
            Initialization Error
          </h2>
          <p className="text-sm font-regular text-muted-foreground mb-4">{error}</p>
          <p className="text-sm font-regular text-muted-foreground">
            Please refresh the page or contact support if the issue persists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="mb-4">
          <img
            src="https://eleven-public-cdn.elevenlabs.io/payloadcms/9trrmnj2sj8-logo-logo.svg"
            alt="ElevenLabs logo"
            className="h-36 w-auto animate-pulse mx-auto"
          />
        </div>
        <h2 className="text-big font-big text-foreground mb-2">
          Loading ElevenLabs App
        </h2>
        <p className="text-sm font-regular text-muted-foreground">Waiting for initialization...</p>
      </div>
    </div>
  );
}

export default LoadingScreen;

