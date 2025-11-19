"use client";
import React from "react";
import ElevenLabsTTSPage from "@/src/features/tts/ElevenLabsTTSPage";
import { IframeResizer } from "@/src/components/AppInitializer";

/**
 * AppRoot component
 * Main app container that renders the TTS interface
 */
export function AppRoot() {
  return (
    <>
      <IframeResizer />
      <ElevenLabsTTSPage />
    </>
  );
}

export default AppRoot;

