import { useCallback, useState } from "react";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { api, ApiError } from "@/services/api";
import { track } from "@/utils/analytics";

export type DownloadState = "IDLE" | "DOWNLOADING" | "PROCESSING" | "COMPLETED" | "FAILED";

interface DownloadEntry {
  state: DownloadState;
  progress: number; // 0..1
  error?: string;
}

/**
 * Drives the on-device half of the download flow described in spec section
 * 7: record the download server-side (counts it, adds it to My Downloads),
 * stream the actual media file to local storage, then hand it to
 * expo-media-library so it lands in the device's Photos/gallery app —
 * matching "Save the media to the appropriate device media/gallery
 * location". Tracks per-status state so multiple cards can download
 * independently.
 */
export function useDownloadStatus() {
  const [entries, setEntries] = useState<Record<string, DownloadEntry>>({});

  const setEntry = useCallback((id: string, patch: Partial<DownloadEntry>) => {
    setEntries((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { state: "IDLE", progress: 0 }), ...patch } }));
  }, []);

  const download = useCallback(
    async (statusId: string, mediaUrl: string, title: string, isVideo: boolean) => {
      setEntry(statusId, { state: "DOWNLOADING", progress: 0, error: undefined });

      try {
        const { status: permStatus } = await MediaLibrary.requestPermissionsAsync();
        if (permStatus !== "granted") {
          setEntry(statusId, { state: "FAILED", error: "Photo library permission denied" });
          return;
        }

        const extension = isVideo ? "mp4" : "jpg";
        const safeName = title.replace(/[^a-z0-9]+/gi, "_").slice(0, 40) || "status";
        const localUri = `${FileSystem.cacheDirectory}${safeName}_${statusId}.${extension}`;

        const downloadResumable = FileSystem.createDownloadResumable(
          mediaUrl,
          localUri,
          {},
          (progressEvent) => {
            const progress =
              progressEvent.totalBytesExpectedToWrite > 0
                ? progressEvent.totalBytesWritten / progressEvent.totalBytesExpectedToWrite
                : 0;
            setEntry(statusId, { progress });
          }
        );

        const result = await downloadResumable.downloadAsync();
        if (!result) throw new Error("Download did not complete");

        setEntry(statusId, { state: "PROCESSING", progress: 1 });
        await MediaLibrary.saveToLibraryAsync(result.uri);

        // Record server-side (bumps download counters, adds to My Downloads
        // history) — best-effort: the file already saved locally either way,
        // so a network blip here shouldn't be reported as a failed download.
        await api.statuses.download(statusId).catch(() => {});

        track("status_downloaded", { statusId, isVideo });
        setEntry(statusId, { state: "COMPLETED", progress: 1 });
      } catch (e) {
        setEntry(statusId, {
          state: "FAILED",
          error: e instanceof ApiError ? e.message : "Download failed. Tap to retry.",
        });
      }
    },
    [setEntry]
  );

  const retry = useCallback(
    (statusId: string, mediaUrl: string, title: string, isVideo: boolean) =>
      download(statusId, mediaUrl, title, isVideo),
    [download]
  );

  const stateFor = useCallback(
    (statusId: string): DownloadEntry => entries[statusId] ?? { state: "IDLE", progress: 0 },
    [entries]
  );

  return { download, retry, stateFor };
}
