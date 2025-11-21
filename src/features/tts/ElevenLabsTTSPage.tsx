"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppState } from "@/src/state/AppStateProvider";
import { useParentApp } from "@/src/hooks/useParentApp";
import { useParentCommunication } from "@/src/hooks/useParentCommunication";
import { useElevenLabsVoices } from "@/src/hooks/useElevenLabsVoices";
import { useElevenLabsHistory } from "@/src/hooks/useElevenLabsHistory";
import { logService } from "@/src/services/logService";

/**
 * ElevenLabs TTS – Clean, robust build (mobile-friendly)
 * NOTE: This build calls serverless API routes so your API key is never exposed to the browser.
 */

function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hasAudio, setHasAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let disposed = false;
    const attach = () => {
      if (disposed) return;
      const a = audioRef.current;
      if (!a) { requestAnimationFrame(attach); return; }
      const onPlay = () => { setIsPlaying(true); setHasAudio(true); startRaf(); };
      const onPause = () => { setIsPlaying(false); stopRaf(); };
      const onLoaded = () => { setDuration(a.duration || 0); };
      const onTime = () => {
        const d = a.duration || 0;
        const t = a.currentTime || 0;
        setCurrentTime(t);
        setDuration(d);
        setProgress(d > 0 ? t / d : 0);
      };
      const onEnded = () => { setIsPlaying(false); stopRaf(); };
      a.addEventListener("play", onPlay);
      a.addEventListener("playing", onPlay);
      a.addEventListener("pause", onPause);
      a.addEventListener("loadedmetadata", onLoaded);
      a.addEventListener("timeupdate", onTime);
      a.addEventListener("seeking", onTime);
      a.addEventListener("seeked", onTime);
      a.addEventListener("ended", onEnded);
      return () => {
        a.removeEventListener("play", onPlay);
        a.removeEventListener("playing", onPlay);
        a.removeEventListener("pause", onPause);
        a.removeEventListener("loadedmetadata", onLoaded);
        a.removeEventListener("timeupdate", onTime);
        a.removeEventListener("seeking", onTime);
        a.removeEventListener("seeked", onTime);
        a.removeEventListener("ended", onEnded);
        stopRaf();
      };
    };
    const cleanup = attach();
    return () => { disposed = true; cleanup && cleanup(); };
  }, []);

  const startRaf = () => {
    if (rafRef.current != null) return;
    const step = () => {
      const a = audioRef.current; if (!a) return;
      if (!a.paused && !a.ended) {
        const d = a.duration || 0; const t = a.currentTime || 0;
        setCurrentTime(t); setDuration(d); setProgress(d > 0 ? t / d : 0);
        rafRef.current = requestAnimationFrame(step);
      } else { stopRaf(); }
    };
    rafRef.current = requestAnimationFrame(step);
  };
  const stopRaf = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };

  const seekPercent = (p: number) => {
    const a = audioRef.current; if (!a || !a.duration) return;
    const clamped = Math.max(0, Math.min(1, p));
    a.currentTime = clamped * a.duration;
    const d = a.duration || 0; const t = a.currentTime || 0;
    setCurrentTime(t); setDuration(d); setProgress(d > 0 ? t / d : 0);
  };

  return { audioRef, hasAudio, setHasAudio, isPlaying, duration, setDuration, currentTime, progress, seekPercent } as const;
}

export default function ElevenLabsTTSPage() {
  const { organizationId, projectId } = useParentApp();
  const { uploadToProject } = useParentCommunication();
  const { voices, loading: loadingVoices, error: voicesError } = useElevenLabsVoices();
  
  const {
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
  } = useAppState();

  useEffect(() => { 
    if (!selectedVoiceId && voices.length) {
      setSelectedVoiceId(voices[0].voice_id);
    }
  }, [voices, selectedVoiceId, setSelectedVoiceId]);

  const [tab, setTab] = useState<"config" | "history">("config");
  const [mobileTab, setMobileTab] = useState<"text" | "config" | "history">("text");
  const isHistoryActive = tab === "history" || mobileTab === "history";
  const { items: historyItems, loading: loadingHistory, error: historyError } = useElevenLabsHistory(isHistoryActive);
  const [historyQuery, setHistoryQuery] = useState("");
  const filteredHistory = useMemo(() => filterHistory(historyItems, historyQuery), [historyItems, historyQuery]);
  
  const [isGenerating, setIsGenerating] = useState(false);

  const { audioRef, hasAudio, setHasAudio, isPlaying, duration, setDuration, currentTime, progress, seekPercent } = useAudioPlayer();
  const [currentAudioUrl, setCurrentAudioUrl] = useState("");
  const [previewing, setPreviewing] = useState<string | null>(null);
  const selectedVoice = useMemo(() => voices.find(v => v.voice_id === selectedVoiceId), [voices, selectedVoiceId]);
  const previewVoiceName = useMemo(() => { const v = voices.find((vv: any) => vv.voice_id === previewing); return v?.name || ""; }, [voices, previewing]);
  const [currentAudioVoiceName, setCurrentAudioVoiceName] = useState("");

  const setAudioSource = async (dataUrl: string, type = "audio/mpeg") => {
    const a = audioRef.current; if (!a) { setHasAudio(true); return; }
    try {
      setHasAudio(true);
      a.pause();
      a.removeAttribute("src");
      while (a.firstChild) a.removeChild(a.firstChild);
      a.currentTime = 0;
      const s = document.createElement("source");
      s.src = dataUrl; s.type = type; a.appendChild(s);
      a.src = dataUrl;
      setCurrentAudioUrl(dataUrl);
      const meta = new Promise<void>((resolve) => {
        const ready = () => Number.isFinite(a.duration) && a.duration > 0;
        if (a.readyState >= 1 && ready()) return resolve();
        const onLoaded = () => { cleanup(); resolve(); };
        const onThrough = () => { cleanup(); resolve(); };
        const onErr = () => { cleanup(); resolve(); };
        const cleanup = () => {
          a.removeEventListener("loadedmetadata", onLoaded);
          a.removeEventListener("canplaythrough", onThrough);
          a.removeEventListener("error", onErr);
        };
        a.addEventListener("loadedmetadata", onLoaded, { once: true });
        a.addEventListener("canplaythrough", onThrough, { once: true });
        a.addEventListener("error", onErr, { once: true });
        setTimeout(() => { cleanup(); resolve(); }, 2000);
      });
      a.load();
      await meta;
      if (Number.isFinite(a.duration) && a.duration > 0) setDuration(a.duration);
      await a.play().catch(() => {});
    } catch (e) {
      console.warn("Audio play failed", e);
    }
  };

  const playPreview = (url?: string, id?: string) => {
    if (!url) return;
    setHasAudio(true);
    setCurrentAudioVoiceName("");
    setPreviewing(id || null);
    setAudioSource(url, "audio/mpeg");
  };

  const playHistoryAudio = async (it: any) => {
    if (!organizationId) {
      alert("Organization ID not available");
      return;
    }
    try {
      setHasAudio(true);
      const endpoint = `/api/elevenlabs/history/${it.history_item_id}/audio?org_uuid=${organizationId}`;
      const r = await fetch(endpoint);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const ct = r.headers.get("content-type") || "audio/mpeg";
      const dataUrl = await blobToDataUrl(blob, ct);
      setPreviewing(null);
      setCurrentAudioVoiceName(it.voice_name || "");
      await setAudioSource(dataUrl, ct);
    } catch (e) {
      console.error(e);
      alert("Failed to load audio");
    }
  };

  const handleGenerateAudio = async () => {
    if (!text.trim()) {
      alert("Please enter some text to generate audio");
      return;
    }
    if (!selectedVoiceId) {
      alert("Please select a voice");
      return;
    }
    if (!organizationId || !projectId) {
      alert("Organization or project ID not available");
      return;
    }

    setIsGenerating(true);
    try {
      logService.info("Generating audio", { voiceId: selectedVoiceId, textLength: text.length });

      // Generate audio
      const response = await fetch("/api/elevenlabs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_uuid: organizationId,
          project_uuid: projectId,
          voice_id: selectedVoiceId,
          text: text,
          model_id: model,
          voice_settings: {
            stability: stability,
            similarity_boost: similarity,
            style: style,
            use_speaker_boost: speakerBoost
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Get audio blob
      const audioBlob = await response.blob();
      const audioUrl = await blobToDataUrl(audioBlob, "audio/mpeg");
      
      // Play the audio
      setHasAudio(true);
      setPreviewing(null);
      setCurrentAudioVoiceName(selectedVoice?.name || "");
      await setAudioSource(audioUrl, "audio/mpeg");

      // Upload to parent app
      const fileName = `elevenlabs-${Date.now()}.mp3`;
      uploadToProject({
        url: audioUrl,
        name: fileName,
        metadata: {
          voice_id: selectedVoiceId,
          model_id: model,
          text: text,
          voice_settings: {
            stability,
            similarity_boost: similarity,
            style,
            use_speaker_boost: speakerBoost
          }
        }
      });

      logService.info("Audio generated and uploaded to parent app", { fileName });
    } catch (error: any) {
      logService.error("Failed to generate audio", { error: error.message });
      alert(`Failed to generate audio: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportToProject = async () => {
    if (!currentAudioUrl) {
      alert("No audio to export. Please generate audio first.");
      return;
    }
    if (!organizationId || !projectId) {
      alert("Organization or project ID not available");
      return;
    }

    try {
      const fileName = `elevenlabs-${Date.now()}.mp3`;
      uploadToProject({
        url: currentAudioUrl,
        name: fileName,
        metadata: {
          voice_id: selectedVoiceId,
          model_id: model,
          text: text,
          voice_settings: {
            stability,
            similarity_boost: similarity,
            style,
            use_speaker_boost: speakerBoost
          }
        }
      });
      logService.info("Audio exported to parent app", { fileName });
      alert("Audio exported to project successfully!");
    } catch (error: any) {
      logService.error("Failed to export audio", { error: error.message });
      alert(`Failed to export audio: ${error.message}`);
    }
  };

  if (loadingVoices && !voices.length) return <Splash />;

  return (
    <div className={"w-full bg-white text-neutral-900 " + (hasAudio ? "pb-28" : "pb-4")}> 
      <VoicesStrip
        voices={voices}
        error={voicesError}
        selectedVoiceId={selectedVoiceId}
        onSelect={setSelectedVoiceId}
        previewing={previewing}
        onPreview={playPreview}
      />

      {/* Mobile 3-tabs experience */}
      <section className="mx-auto block max-w-7xl px-6 md:hidden">
        <TabsThree value={mobileTab} onChange={setMobileTab} items={["Text", "Configuration", "History"]} />
        <div className="pb-40">
          {mobileTab === "text" && (
            <div className="pt-4">
              <Editor 
                text={text} 
                onChange={setText} 
                hasAudio={hasAudio}
                onGenerate={handleGenerateAudio}
                onExport={handleExportToProject}
                isGenerating={isGenerating}
                hasCurrentAudio={!!currentAudioUrl}
              />
            </div>
          )}
          {mobileTab === "config" && (
            <div className="pt-4"><ConfigPanel
              voices={voices}
              selectedVoiceId={selectedVoiceId}
              onVoice={setSelectedVoiceId}
              model={model}
              onModel={setModel}
              speed={speed} onSpeed={setSpeed}
              stability={stability} onStability={setStability}
              similarity={similarity} onSimilarity={setSimilarity}
              style={style} onStyle={setStyle}
              speakerBoost={speakerBoost} onSpeakerBoost={setSpeakerBoost}
              onGenerate={handleGenerateAudio}
              onExport={handleExportToProject}
              isGenerating={isGenerating}
              hasAudio={!!currentAudioUrl}
            /></div>
          )}
          {mobileTab === "history" && (
            <div className="pt-4"><HistoryPanel
              query={historyQuery}
              onQuery={setHistoryQuery}
              loading={loadingHistory}
              error={historyError}
              items={filteredHistory}
              onSelect={(it) => { if (it?.text) setText(it.text); if (it?.model_id) setModel(it.model_id); playHistoryAudio(it); }}
            /></div>
          )}
        </div>
      </section>

      {/* Desktop main content */}
      <main className="mx-auto hidden max-w-7xl border-t border-neutral-200 px-6 pb-8 md:block">
        <div className="md:flex md:items-start gap-8 py-8">
          <section className="flex-1 pr-4 md:pr-8">
            <Editor text={text} onChange={setText} />
          </section>

          <div className="hidden md:block w-px bg-neutral-200 self-stretch min-h-[400px]" />

          <aside className="md:px-4 md:w-[380px] flex flex-col">
            <div className="sticky top-6 z-10 bg-white">
              <Tabs value={tab} onChange={setTab} items={["Configuration", "History"]} />
            </div>
            <div className={"mt-2 " + (hasAudio ? "pb-28" : "pb-4")}>
              {tab === "config" ? (
                <ConfigPanel
                  voices={voices}
                  selectedVoiceId={selectedVoiceId}
                  onVoice={setSelectedVoiceId}
                  model={model}
                  onModel={setModel}
                  speed={speed} onSpeed={setSpeed}
                  stability={stability} onStability={setStability}
                  similarity={similarity} onSimilarity={setSimilarity}
                  style={style} onStyle={setStyle}
                  speakerBoost={speakerBoost} onSpeakerBoost={setSpeakerBoost}
                  onGenerate={handleGenerateAudio}
                  onExport={handleExportToProject}
                  isGenerating={isGenerating}
                  hasAudio={!!currentAudioUrl}
                />
              ) : (
                <HistoryPanel
                  query={historyQuery}
                  onQuery={setHistoryQuery}
                  loading={loadingHistory}
                  error={historyError}
                  items={filteredHistory}
                  onSelect={(it) => { if (it?.text) setText(it.text); if (it?.model_id) setModel(it.model_id); playHistoryAudio(it); }}
                />
              )}
            </div>
          </aside>
        </div>
      </main>

      {hasAudio && (
        <PlayerBar
          isPlaying={isPlaying}
          onToggle={() => { const a = audioRef.current; if (!a) return; a.paused ? a.play() : a.pause(); }}
          title={(previewing ? previewVoiceName : (currentAudioVoiceName || selectedVoice?.name)) || "—"}
          progress={progress}
          currentTime={currentTime}
          duration={duration}
          onSeek={seekPercent}
          downloadUrl={currentAudioUrl}
        />
      )}
      <audio ref={audioRef} className="absolute w-0 h-0 opacity-0 pointer-events-none" preload="metadata" />
    </div>
  );
}

function VoicesStrip({ voices, error, selectedVoiceId, onSelect, onPreview, previewing }: any) {
  return (
    <section className="w-full bg-white">
      <div className="mx-auto max-w-7xl px-6 pt-2 pb-4">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500">Voices</div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {error ? (
            <div className="text-xs text-red-600">{error}</div>
          ) : (
            (voices.length ? voices : Array.from({ length: 6 })).map((v: any, i: number) => (
              v ? (
                <div
                  key={v.voice_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => { onSelect(v.voice_id); if (v.preview_url) onPreview(v.preview_url, v.voice_id); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(v.voice_id); }}
                  className={`group w-[200px] shrink-0 rounded-xl border p-2 text-left transition hover:shadow-sm ${selectedVoiceId === v.voice_id ? "border-neutral-900" : "border-neutral-200"}`}
                  title={v.name}
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-lg ${badgeGradientFor(v?.labels?.language)}`} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium leading-tight">{flagFor(v?.labels)} {v.name}</div>
                      <div className="mt-0.5 hidden truncate text-[11px] text-neutral-500 md:block">{formatLabels(v?.labels)}</div>
                    </div>
                    {v.preview_url && (
                      <button
                        type="button"
                        className="ml-auto hidden rounded-full border border-neutral-300 px-2 py-0.5 text-[11px] leading-5 text-neutral-700 transition hover:bg-neutral-100 group-hover:inline-block"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); previewing === v.voice_id ? null : onPreview(v.preview_url, v.voice_id); }}
                      >
                        {previewing === v.voice_id ? "■" : "▶"}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div key={i} className="h-[72px] w-[200px] shrink-0 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100" />
              )
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function Editor({ 
  text, 
  onChange, 
  hasAudio = false,
  onGenerate,
  onExport,
  isGenerating = false,
  hasCurrentAudio = false
}: { 
  text: string; 
  onChange: (v: string) => void; 
  hasAudio?: boolean;
  onGenerate?: () => void;
  onExport?: () => void;
  isGenerating?: boolean;
  hasCurrentAudio?: boolean;
}) {
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const empty = (text || "").length === 0;

  const onImportClick = () => fileRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const content = await f.text();
      onChange(content);
    } catch (err) {
      console.error(err);
      alert("Could not import this file.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <section className="pt-8 pr-4 md:pr-8">
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className="h-[360px] w-full resize-none border-0 bg-transparent p-0 outline-none"
          placeholder=""
        />

        {empty && (
          <div className="pointer-events-none absolute left-0 top-0 flex w-full items-center text-neutral-400" style={{ textShadow: "none" }}>
            <span className="pl-[1px] pt-[2px]">Write your text here or</span>
            <button
              type="button"
              onClick={onImportClick}
              className="pointer-events-auto ml-2 select-none pr-[2px] pt-[2px] opacity-70 underline decoration-dotted underline-offset-2 transition-opacity hover:opacity-100"
              style={{ textShadow: "none" }}
            >
              📁 Import Content
            </button>
          </div>
        )}

        <input ref={fileRef} type="file" accept=".txt,.md,.markdown,.json,.srt,.vtt,.csv,.rtf" className="hidden" onChange={onFile} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="text-xs text-neutral-500">{text.length.toLocaleString()} / 5,000 characters</div>
      </div>

      <div className={`md:hidden fixed inset-x-0 ${hasAudio ? "bottom-28" : "bottom-4"} z-30 px-4 pb-4`}>
        <Btn className="w-full shadow-lg" onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? "Generating..." : "Generate audio"}
        </Btn>
        <Btn variant="ghost" className="mt-2 w-full" onClick={onExport} disabled={!hasCurrentAudio}>
          Export to Project
        </Btn>
      </div>
    </section>
  );
}

function ConfigPanel(props: any) {
  const { 
    voices, selectedVoiceId, onVoice, model, onModel, 
    speed, onSpeed, stability, onStability, similarity, onSimilarity, 
    style, onStyle, speakerBoost, onSpeakerBoost,
    onGenerate, onExport, isGenerating, hasAudio
  } = props;
  return (
    <div className="space-y-6 pb-8">
      <Field label="Voice"><Select value={selectedVoiceId} onChange={onVoice} options={voices.map((v: any) => ({ label: v.name, value: v.voice_id }))} /></Field>
      <Field label="Model"><Select value={model} onChange={onModel} options={MODEL_OPTIONS} /></Field>
      <Range label="Speed" value={speed} onChange={onSpeed} left="Slower" right="Faster" />
      <Range label="Stability" value={stability} onChange={onStability} left="More variable" right="More stable" />
      <Range label="Similarity" value={similarity} onChange={onSimilarity} left="Low" right="High" />
      <Range label="Style exaggeration" value={style} onChange={onStyle} left="None" right="Exaggerated" />
      <div className="mt-4 flex items-center justify-between"><label className="text-sm">Speaker boost</label><Switch checked={speakerBoost} onChange={onSpeakerBoost} /></div>
      <div className="-mt-[10px]">
        <Btn className="w-full" onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? "Generating..." : "Generate audio"}
        </Btn>
      </div>
      <div className="mt-2">
        <Btn variant="ghost" className="w-full" onClick={onExport} disabled={!hasAudio}>
          Export to Project
        </Btn>
      </div>
    </div>
  );
}

function HistoryPanel({ query, onQuery, items, loading, error, onSelect }: any) {
  return (
    <div className="space-y-3">
      <input className="mb-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none" placeholder="Search history..." value={query} onChange={(e) => onQuery((e.target as HTMLInputElement).value)} />
      <div className="max-h-[600px] overflow-y-auto pr-1">
        <HistoryList items={items} loading={loading} error={error} onSelect={onSelect} />
      </div>
    </div>
  );
}

function PlayerBar({ isPlaying, onToggle, title, progress, currentTime, duration, onSeek, downloadUrl }: any) {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-2.5 md:py-3 grid grid-cols-[auto,1fr,auto] items-center gap-2 md:gap-3">
        <button
          onClick={onToggle}
          className="grid h-9 w-9 md:h-10 md:w-10 place-items-center rounded-full bg-neutral-900 text-white"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>

        <div className="min-w-0 w-full">
          <div className="flex items-center justify-between">
            <div className="truncate text-sm text-neutral-700 md:text-xs" title={title}>{title}</div>
            <div className="hidden md:block whitespace-nowrap text-xs tabular-nums text-neutral-600 md:w-28 text-right">
              {fmtTime(currentTime)} <span className="mx-1 text-neutral-400">/</span> {fmtTime(duration)}
            </div>
          </div>

          <div className="mt-1 grid grid-cols-[1fr,auto] items-center gap-2">
            <div
              className="relative h-1 w-full cursor-pointer rounded-full bg-neutral-200"
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width; onSeek(pct);
              }}
            >
              <div className="absolute left-0 top-0 h-1 rounded-full bg-neutral-900" style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
            </div>

            <button
              onClick={() => {
                if (!downloadUrl) return;
                const a = document.createElement("a");
                a.href = downloadUrl;
                a.download = `audio-${Date.now()}.mp3`;
                document.body.appendChild(a);
                a.click();
                a.remove();
              }}
              title="Download"
              aria-label="Download audio"
              className="grid h-8 w-8 place-items-center rounded-full border border-neutral-300 text-neutral-700 hover:bg-neutral-50 md:hidden"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M12 3a1 1 0 0 1 1 1v8.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L11 12.586V4a1 1 0 0 1 1-1z"/>
                <path d="M4 15a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1zm0 4a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1z"/>
              </svg>
            </button>

            <div className="col-span-1 col-start-1 row-start-2 mt-1 block whitespace-nowrap text-right text-xs tabular-nums text-neutral-600 md:hidden">
              {fmtTime(currentTime)} <span className="mx-1 text-neutral-400">/</span> {fmtTime(duration)}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            if (!downloadUrl) return;
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = `audio-${Date.now()}.mp3`;
            document.body.appendChild(a);
            a.click();
            a.remove();
          }}
          title="Download"
          aria-label="Download audio"
          className="hidden md:grid h-8 w-8 place-items-center justify-self-end rounded-full border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M12 3a1 1 0 0 1 1 1v8.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L11 12.586V4a1 1 0 0 1 1-1z"/>
            <path d="M4 15a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1zm0 4a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1z"/>
          </svg>
        </button>
      </div>
    </footer>
  );
}

const MODEL_OPTIONS = [
  { value: "eleven_multilingual_v2", label: "Eleven Multilingual v2" },
  { value: "eleven_turbo_v2_5", label: "Eleven Turbo v2.5 (alpha)" },
  { value: "eleven_flash_v2_5", label: "Eleven Flash v2.5" },
];

function Tabs({ value, onChange, items }: { value: string; onChange: (v: any) => void; items: [string, string] }) {
  return (
    <div className="mb-4 border-b border-neutral-200">
      <nav className="-mb-px flex gap-6">
        {items.map((label, idx) => {
          const key = label.toLowerCase();
          const active = (value === "config" && idx === 0) || (value === "history" && idx === 1);
          return (
            <button key={key} className={`pb-2 text-sm font-medium ${active ? "border-b-2 border-neutral-900 text-neutral-900" : "border-b-2 border-transparent text-neutral-500 hover:text-neutral-700"}`} onClick={() => onChange(idx === 0 ? "config" : "history")}>{label}</button>
          );
        })}
      </nav>
    </div>
  );
}

function TabsThree({ value, onChange, items }: { value: string; onChange: (v: any) => void; items: [string, string, string] }) {
  const keys = ["text", "config", "history"];
  return (
    <div className="mb-3 border-b border-neutral-200">
      <nav className="-mb-px flex gap-6 overflow-x-auto">
        {items.map((label, idx) => {
          const key = keys[idx];
          const active = value === key;
          return (
            <button key={key} className={`pb-2 text-sm font-medium ${active ? "border-b-2 border-neutral-900 text-neutral-900" : "border-b-2 border-transparent text-neutral-500 hover:text-neutral-700"}`} onClick={() => onChange(key)}>{label}</button>
          );
        })}
      </nav>
    </div>
  );
}

function Select({ value, onChange, options, className = "" }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[]; className?: string }) {
  return (
    <div className={`relative w-full ${className}`}>
      <select className="w-full appearance-none rounded-xl border border-neutral-300 bg-white px-3 py-2 pr-8 text-sm focus:outline-none" value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value)}>
        {options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500">▾</span>
    </div>
  );
}

function Range({ label, value, onChange, left, right, format = (v: number) => `${Math.round(v * 100)}%` }: any) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const knobLeft: any = pct <= 0 ? 7 : pct >= 100 ? "calc(100% - 7px)" : `calc(${pct}% - 7px)`;
  return (
    <div className="mb-5 pt-2">
      <div className="mb-2 flex items-center justify-between"><div className="text-sm font-medium">{label}</div><div className="rounded-md px-2 py-0.5 text-xs text-neutral-600">{format(value)}</div></div>
      <div className="relative h-1.5 w-full rounded-full bg-neutral-200">
        <div className="absolute left-0 top-0 h-1.5 rounded-full bg-neutral-900" style={{ width: `${pct}%` }} />
        <div className="absolute top-1/2 -translate-y-1/2 rounded-full border border-neutral-900 bg-white shadow-sm" style={{ left: knobLeft, height: 14, width: 14 }} />
        <input type="range" min={0} max={1} step={0.01} value={value} onChange={(e) => onChange(parseFloat((e.target as HTMLInputElement).value))} className="absolute left-0 top-0 h-3.5 w-full cursor-pointer opacity-0" />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-neutral-500"><span>{left}</span><span>{right}</span></div>
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${checked ? "border-neutral-900 bg-neutral-900" : "border-neutral-300 bg-neutral-200"}`} aria-pressed={checked} role="switch">
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${checked ? "translate-x-5" : "translate-x-1"}`} />
    </button>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-0">
      <div className="mb-4"><h3 className="text-sm font-semibold">{title}</h3></div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4"><div className="mb-2 text-sm font-medium">{label}</div>{children}</div>
  );
}

function Btn({ children, variant = "solid", className = "", onClick, disabled = false }: any) {
  const base = "h-9 rounded-lg px-3 text-sm";
  const style = variant === "ghost" ? "border border-neutral-300 hover:bg-neutral-50" : "bg-neutral-900 text-white hover:opacity-95";
  const disabledStyle = disabled ? "opacity-50 cursor-not-allowed" : "";
  return (
    <button 
      className={`${base} ${style} ${disabledStyle} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <img src="https://eleven-public-cdn.elevenlabs.io/payloadcms/9trrmnj2sj8-logo-logo.svg" alt="ElevenLabs logo" className="h-36 w-auto animate-pulse" />
        <div className="text-sm text-neutral-600">Loading App...</div>
      </div>
    </div>
  );
}

function fmtTime(secs: number) {
  if (!Number.isFinite(secs) || secs < 0) secs = 0;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

async function blobToDataUrl(blob: Blob, mimeFallback = "audio/mpeg"): Promise<string> {
  const type = blob.type && blob.type !== "application/octet-stream" ? blob.type : mimeFallback;
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.readAsDataURL(new Blob([blob], { type }));
    } catch (e) { reject(e as any); }
  });
}

function timeAgo(unix: number) {
  try {
    const diff = Date.now() - unix * 1000;
    const m = Math.floor(diff / 60000); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch { return ""; }
}

function groupHistory(items: any[]) {
  const groups: Record<string, any[]> = {};
  const labelFor = (unix: number) => {
    const d = new Date(unix * 1000), now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startYesterday = startToday - 86400000; const t = d.getTime();
    if (t >= startToday) return "Today"; if (t >= startYesterday) return "Yesterday"; return d.toLocaleDateString();
  };
  items.forEach((it) => { const k = labelFor(it.date_unix); (groups[k] ||= []).push(it); });
  return groups;
}

function filterHistory(items: any[], query: string) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return items;
  return (items || []).filter((it) => {
    const hay = `${it.text || ""} ${it.voice_name || ""} ${it.model_id || ""}`.toLowerCase();
    return hay.includes(q);
  });
}

function HistoryList({ items, loading, error, onSelect }: { items: any[]; loading: boolean; error: string; onSelect: (it: any) => void }) {
  if (loading) return <div className="text-xs text-neutral-500">Loading…</div>;
  if (error) return <div className="text-xs text-red-600">{error}</div>;
  if (!items?.length) return <div className="text-xs text-neutral-500">No history yet.</div>;
  const groups = groupHistory(items);
  const order = (k: string) => (k === "Today" ? 2 : k === "Yesterday" ? 1 : 0);
  return (
    <div className="space-y-6 pr-1">
      {Object.keys(groups).sort((a, b) => order(b) - order(a)).map((k) => (
        <div key={k}>
          <div className="mb-2"><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">{k}</span></div>
          <ul className="space-y-2">
            {groups[k].map((it: any) => (
              <li key={it.history_item_id}>
                <button onClick={() => onSelect(it)} className="w-full rounded-lg border border-neutral-200 p-3 text-left hover:bg-neutral-50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate text-sm font-medium">{it.voice_name || "Unknown"} · {it.model_id}</div>
                    <div className="whitespace-nowrap text-[11px] text-neutral-500">{timeAgo(it.date_unix)}</div>
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs text-neutral-600">{it.text}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function formatLabels(labels: any = {}) {
  const lang = labels.language?.toUpperCase?.() || labels.language || "";
  const accent = labels.accent?.replace("en-", "").replace("es-", "") || "";
  const gender = labels.gender || "";
  const parts = [lang, accent, gender].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Personal";
}

function flagFor(labels: any = {}) {
  const acc = (labels.accent || "").toLowerCase();
  const lang = (labels.language || "").toLowerCase();
  if (acc.includes("american")) return "🇺🇸";
  if (acc.includes("british")) return "🇬🇧";
  if (acc.includes("australian")) return "🇦🇺";
  if (acc.includes("irish")) return "🇮🇪";
  if (acc.includes("scottish")) return "🏴";
  if (acc.includes("argentine")) return "🇦🇷";
  if (acc.includes("peninsular")) return "🇪🇸";
  if (acc.includes("dutch")) return "🇳🇱";
  if (acc.includes("polish")) return "🇵🇱";
  if (acc.includes("spanish")) return "🇪🇸";
  const byLang: Record<string, string> = { en: "🇺🇸", es: "🇪🇸", de: "🇩🇪", fr: "🇫🇷", it: "🇮🇹", pt: "🇵🇹", pl: "🇵🇱", lt: "🇱🇹", nl: "🇳🇱" };
  return byLang[lang] || "🏳️";
}

function badgeGradientFor(language: string = "") {
  const lang = language?.toLowerCase?.() || "";
  const map: Record<string, string> = {
    en: "bg-gradient-to-br from-sky-200 to-blue-400",
    es: "bg-gradient-to-br from-amber-200 to-orange-400",
    de: "bg-gradient-to-br from-yellow-200 to-amber-400",
    fr: "bg-gradient-to-br from-rose-200 to-pink-400",
    it: "bg-gradient-to-br from-green-200 to-emerald-400",
    pt: "bg-gradient-to-br from-lime-200 to-green-400",
    pl: "bg-gradient-to-br from-indigo-200 to-indigo-400",
    lt: "bg-gradient-to-br from-purple-200 to-fuchsia-400",
    nl: "bg-gradient-to-br from-cyan-200 to-teal-400",
  };
  return map[lang] || "bg-gradient-to-br from-neutral-200 to-neutral-400";
}

// --- Minimal dev assertions ---
(function devTests() {
  try {
    console.assert(flagFor({ language: "en", accent: "en-american" }) === "🇺🇸", "flag US");
    console.assert(formatLabels({ language: "es", accent: "es-peninsular" }) === "ES · peninsular", "labels ES");
    const t = timeAgo(Math.floor(Date.now() / 1000));
    console.assert(typeof t === "string" && t.length > 0, "timeAgo ok");
    const sample = [
      { text: "Hello world", voice_name: "Nick", model_id: "eleven_multilingual_v2" },
      { text: "Buenos días", voice_name: "Rachel", model_id: "eleven_flash_v2_5" },
    ];
    console.assert(filterHistory(sample, "hello").length === 1, "filter by text");
    console.assert(filterHistory(sample, "rachel").length === 1, "filter by voice");
    console.assert(filterHistory(sample, "").length === sample.length, "empty query returns all");
  } catch (e) {
    console.warn("dev tests failed", e);
  }
})();