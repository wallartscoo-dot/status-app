import React, { createContext, useContext, useMemo, useState } from "react";
import type { ApiSound } from "@/services/api";

export interface VolumeMix {
  originalVolume: number; // 0–1, the video's own audio
  soundVolume: number; // 0–1, the selected sound
}

export interface TrimRange {
  startSec: number;
  endSec: number;
}

interface SoundSelectionValue {
  sound: ApiSound | null;
  trim: TrimRange | null;
  volumes: VolumeMix;
  /** Sets the sound and resets trim to its full (or max-allowed) length + default volumes. */
  selectSound: (sound: ApiSound) => void;
  setTrim: (trim: TrimRange) => void;
  setVolumes: (volumes: VolumeMix) => void;
  clear: () => void;
}

const DEFAULT_VOLUMES: VolumeMix = { originalVolume: 1, soundVolume: 1 };

const SoundSelectionContext = createContext<SoundSelectionValue | undefined>(undefined);

/**
 * Holds the "Open Sound Library → Search/Browse → Preview → Favorite or Use
 * Sound → Trim → Adjust Volume → Video Editor" selection in memory across
 * that whole navigation stack, so the Create screen can read it back
 * without threading it through router params (trim/volume state doesn't
 * serialize cleanly into a URL, and the flow is always same-session).
 */
export function SoundSelectionProvider({ children }: { children: React.ReactNode }) {
  const [sound, setSound] = useState<ApiSound | null>(null);
  const [trim, setTrimState] = useState<TrimRange | null>(null);
  const [volumes, setVolumesState] = useState<VolumeMix>(DEFAULT_VOLUMES);

  const value = useMemo<SoundSelectionValue>(
    () => ({
      sound,
      trim,
      volumes,
      selectSound: (next) => {
        setSound(next);
        const defaultEnd = Math.min(next.durationSec, Math.max(next.minTrimSec, Math.min(15, next.maxTrimSec)));
        setTrimState({ startSec: 0, endSec: defaultEnd });
        setVolumesState(DEFAULT_VOLUMES);
      },
      setTrim: (t) => setTrimState(t),
      setVolumes: (v) => setVolumesState(v),
      clear: () => {
        setSound(null);
        setTrimState(null);
        setVolumesState(DEFAULT_VOLUMES);
      },
    }),
    [sound, trim, volumes]
  );

  return <SoundSelectionContext.Provider value={value}>{children}</SoundSelectionContext.Provider>;
}

export function useSoundSelection() {
  const ctx = useContext(SoundSelectionContext);
  if (!ctx) throw new Error("useSoundSelection must be used within SoundSelectionProvider");
  return ctx;
}
