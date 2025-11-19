import { useEffect, useState } from "react";
import { useParentApp } from "./useParentApp";

/**
 * Hook to fetch ElevenLabs voices
 */
export function useElevenLabsVoices() {
  const { organizationId } = useParentApp();
  const [voices, setVoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId) return;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const r = await fetch(`/api/elevenlabs/voices?org_uuid=${organizationId}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        setVoices(json?.voices || []);
      } catch (e: any) {
        console.error(e);
        setError("Failed to load voices.");
      } finally {
        setLoading(false);
      }
    })();
  }, [organizationId]);

  return { voices, loading, error } as const;
}

export default useElevenLabsVoices;

