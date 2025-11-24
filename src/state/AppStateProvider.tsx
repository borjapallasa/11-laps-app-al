"use client";
import React, { createContext, useContext, useState } from "react";
import type { InitPayload, MediaItem } from "@/src/services/postMessageService";
import { ToastProvider } from "@/src/components/Toast";

// Parent data from INIT message
type ParentData = {
  projectId: string;
  organizationId: string;
  userId: string;
  appInstallationId: string;
  permissions: string[];
};

type State = {
  // API Key
  apiKey: string | null;
  setApiKey: (k: string | null) => void;
  hasApiKey: boolean;
  setHasApiKey: (has: boolean) => void;

  // Voice selection
  selectedVoiceId: string;
  setSelectedVoiceId: (id: string) => void;

  // Text input
  text: string;
  setText: (text: string) => void;

  // Voice settings
  model: string;
  setModel: (model: string) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  stability: number;
  setStability: (stability: number) => void;
  similarity: number;
  setSimilarity: (similarity: number) => void;
  style: number;
  setStyle: (style: number) => void;
  speakerBoost: boolean;
  setSpeakerBoost: (boost: boolean) => void;

  // Parent app data (from INIT message)
  parentData: ParentData | null;
  setParentData: (data: ParentData) => void;

  // Project data
  projectContent: string | null;
  setProjectContent: (content: string) => void;
  projectAudio: MediaItem[];
  setProjectAudio: (audio: MediaItem[]) => void;

  // Initialization state
  isInitialized: boolean;
  setIsInitialized: (init: boolean) => void;

  // Current job
  currentJobId: string | null;
  setCurrentJobId: (id: string | null) => void;
};

const Ctx = createContext<State | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  // API Key
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  // Voice selection
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");

  // Text input
  const [text, setText] = useState("");

  // Voice settings
  const [model, setModel] = useState("eleven_multilingual_v2");
  const [speed, setSpeed] = useState(0.2);
  const [stability, setStability] = useState(0.85);
  const [similarity, setSimilarity] = useState(0.9);
  const [style, setStyle] = useState(0);
  const [speakerBoost, setSpeakerBoost] = useState(true);

  // Parent app data
  const [parentData, setParentData] = useState<ParentData | null>(null);
  const [projectContent, setProjectContent] = useState<string | null>(null);
  const [projectAudio, setProjectAudio] = useState<MediaItem[]>([]);

  // Initialization
  const [isInitialized, setIsInitialized] = useState(false);

  // Current job
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  const value: State = {
    apiKey,
    setApiKey,
    hasApiKey,
    setHasApiKey,
    selectedVoiceId,
    setSelectedVoiceId,
    text,
    setText,
    model,
    setModel,
    speed,
    setSpeed,
    stability,
    setStability,
    similarity,
    setSimilarity,
    style,
    setStyle,
    speakerBoost,
    setSpeakerBoost,
    parentData,
    setParentData,
    projectContent,
    setProjectContent,
    projectAudio,
    setProjectAudio,
    isInitialized,
    setIsInitialized,
    currentJobId,
    setCurrentJobId,
  };

  return (
    <Ctx.Provider value={value}>
      <ToastProvider>{children}</ToastProvider>
    </Ctx.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}

