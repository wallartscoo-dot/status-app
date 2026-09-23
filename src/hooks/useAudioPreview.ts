import { useCallback, useEffect, useRef, useState } from "react";
import { Audio, AVPlaybackStatus } from "expo-av";

// A single module-level sound instance shared by every SoundCard/preview
// button in the app, so tapping "preview" on one sound always stops
// whatever else was playing — matching the "only one preview at a time"
// behavior of TikTok/Reels-style sound pickers.
let sharedSound: Audio.Sound | null = null;
let sharedUri: string | null = null;
const listeners = new Set<(playingUri: string | null) => void>();
let currentPlayingUri: string | null = null;

function notify(uri: string | null) {
  currentPlayingUri = uri;
  listeners.forEach((l) => l(uri));
}

async function stopShared() {
  if (sharedSound) {
    try {
      await sharedSound.stopAsync();
      await sharedSound.unloadAsync();
    } catch {
      // ignore — sound may already be unloaded
    }
    sharedSound = null;
    sharedUri = null;
  }
  notify(null);
}

/**
 * Plays `uri` from `startSec` and stops automatically at `endSec` (used for
 * both quick sound-card previews and trim-range previews). Streams rather
 * than downloading the full file — expo-av buffers progressively over HTTP
 * range requests, so a 3-minute track isn't fully fetched just to preview
 * a 15-second clip.
 */
async function playShared(uri: string, startSec = 0, endSec?: number) {
  await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

  if (sharedUri === uri && sharedSound) {
    await sharedSound.setPositionAsync(Math.round(startSec * 1000));
    await sharedSound.playAsync();
    notify(uri);
    return;
  }

  await stopShared();

  const { sound } = await Audio.Sound.createAsync(
    { uri },
    { positionMillis: Math.round(startSec * 1000), shouldPlay: true }
  );
  sharedSound = sound;
  sharedUri = uri;

  sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    if (endSec !== undefined && status.positionMillis >= endSec * 1000) {
      sound.pauseAsync().catch(() => {});
      notify(null);
    } else if (status.didJustFinish) {
      notify(null);
    }
  });

  notify(uri);
}

async function pauseShared() {
  if (sharedSound) {
    try {
      await sharedSound.pauseAsync();
    } catch {
      // ignore
    }
  }
  notify(null);
}

/**
 * Hook wrapping the shared preview player, scoped to one `uri`. Returns
 * whether *this* uri is the one currently playing, plus toggle/seek
 * helpers — every SoundCard uses this so only one heart/waveform animates
 * "playing" at a time across the whole list.
 */
export function useAudioPreview(uri: string | undefined) {
  const [isPlaying, setIsPlaying] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const listener = (playingUri: string | null) => {
      if (mounted.current) setIsPlaying(!!uri && playingUri === uri);
    };
    listeners.add(listener);
    listener(currentPlayingUri);
    return () => {
      mounted.current = false;
      listeners.delete(listener);
    };
  }, [uri]);

  const toggle = useCallback(
    (startSec = 0, endSec?: number) => {
      if (!uri) return;
      if (isPlaying) {
        pauseShared();
      } else {
        playShared(uri, startSec, endSec).catch(() => {});
      }
    },
    [uri, isPlaying]
  );

  const play = useCallback(
    (startSec = 0, endSec?: number) => {
      if (!uri) return;
      playShared(uri, startSec, endSec).catch(() => {});
    },
    [uri]
  );

  const pause = useCallback(() => pauseShared(), []);
  const stop = useCallback(() => stopShared(), []);

  return { isPlaying, toggle, play, pause, stop };
}
