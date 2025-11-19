import { useEffect, useState } from "react";
import { useParentApp } from "./useParentApp";

/**
 * Hook to fetch ElevenLabs history (lazy loaded)
 */
export function useElevenLabsHistory(active: boolean) {
  const { organizationId } = useParentApp();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!active || !organizationId || items.length || loading) return;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const r = await fetch(`/api/elevenlabs/history?org_uuid=${organizationId}&page_size=25`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        setItems(json?.history || []);
      } catch (e: any) {
        console.error(e);
        setError("Failed to load history.");
      } finally {
        setLoading(false);
      }
    })();
  }, [active, organizationId]);

  return { items, setItems, loading, error } as const;
}

export default useElevenLabsHistory;

