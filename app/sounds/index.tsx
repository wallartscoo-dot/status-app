import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { SoundCard } from "@/components/SoundCard";
import { useAudioPreview } from "@/hooks/useAudioPreview";
import { GlassSurface } from "@/components/Glass";
import { SoundSkeletonList, SoundEmptyState } from "@/components/SoundSkeleton";
import { MoodChip } from "@/components/MoodChip";
import { useAppTheme } from "@/theme/ThemeProvider";
import { useAuth } from "@/context/AuthContext";
import { spacing, radius, typography } from "@/theme/tokens";
import {
  api,
  ApiError,
  type ApiPaginated,
  type ApiSound,
  type IslamicSubcategory,
} from "@/services/api";
import {
  LIBRARY_TABS,
  ISLAMIC_SUBCATEGORIES,
  type LibraryTabKey,
} from "@/constants/sounds";

type SoundstripePlaylist = {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, unknown>;
};

type SoundstripeResource = {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, unknown>;
};

const PAGE_LIMIT = 20;

type SoundstripeSongRowProps = {
  title: string;
  artist?: string;
  audioUrl?: string;
  theme: ReturnType<typeof useAppTheme>["theme"];
};

function SoundstripeSongRow({ title, artist, audioUrl, theme }: SoundstripeSongRowProps) {
  const { isPlaying, toggle } = useAudioPreview(audioUrl);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", padding: spacing.lg, borderRadius: radius.lg, backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, gap: spacing.md }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: "700" }}>{title}</Text>
        {!!artist && <Text style={{ color: theme.textMuted, marginTop: spacing.xs }}>{artist}</Text>}
        {!audioUrl && <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: spacing.xs }}>Preview audio unavailable</Text>}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={isPlaying ? `Pause ${title}` : `Play ${title}`} disabled={!audioUrl} onPress={() => void toggle()} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: audioUrl ? theme.accent : theme.border, opacity: audioUrl ? 1 : 0.5 }}>
        <Ionicons name={isPlaying ? "pause" : "play"} size={21} color={theme.onAccent} />
      </Pressable>
    </View>
  );
}

export default function SoundLibrary() {
  const { theme } = useAppTheme();
  const { user } = useAuth();

  const [tab, setTab] = useState<LibraryTabKey>("ALL");
  const [islamicSub, setIslamicSub] = useState<IslamicSubcategory | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [items, setItems] = useState<ApiSound[]>([]);
  const [trending, setTrending] = useState<ApiSound[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const requestId = useRef(0);

  const [soundstripePlaylists, setSoundstripePlaylists] = useState<
    SoundstripePlaylist[]
  >([]);
  const [soundstripeLoading, setSoundstripeLoading] = useState(false);
  const [soundstripeError, setSoundstripeError] = useState<string | null>(null);
  const [soundstripeIncluded, setSoundstripeIncluded] = useState<
    SoundstripeResource[]
  >([]);
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<SoundstripePlaylist | null>(null);

  // Debounce search input before hitting the API.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(
    async (targetPage: number, replace: boolean) => {
      if (tab === "SOUNDSTRIPE") return;

      const myRequest = ++requestId.current;

      if (replace) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        let result: ApiPaginated<ApiSound>;

        if (debouncedQuery) {
          result = await api.sounds.search(debouncedQuery, {
            page: targetPage,
            limit: PAGE_LIMIT,
            category:
              tab === "MUSIC"
                ? "MUSIC"
                : tab === "ISLAMIC"
                  ? "ISLAMIC"
                  : undefined,
            islamicSubcategory: islamicSub ?? undefined,
          });
        } else if (tab === "TRENDING") {
          result = await api.sounds.trending({
            page: targetPage,
            limit: PAGE_LIMIT,
          });
        } else if (tab === "FAVORITES") {
          if (!user || user.isGuest) {
            result = {
              items: [],
              page: 1,
              limit: PAGE_LIMIT,
              total: 0,
              totalPages: 1,
            };
          } else {
            result = await api.sounds.listFavorites(targetPage);
          }
        } else {
          result = await api.sounds.list({
            page: targetPage,
            limit: PAGE_LIMIT,
            category:
              tab === "MUSIC"
                ? "MUSIC"
                : tab === "ISLAMIC"
                  ? "ISLAMIC"
                  : undefined,
            islamicSubcategory: islamicSub ?? undefined,
          });
        }

        if (myRequest !== requestId.current) return;

        setItems((prev) =>
          replace ? result.items : [...prev, ...result.items]
        );
        setPage(result.page);
        setTotalPages(result.totalPages);
      } catch (e) {
        if (myRequest !== requestId.current) return;

        setError(
          e instanceof ApiError
            ? e.message
            : "Couldn't load sounds. Pull to try again."
        );

        if (replace) setItems([]);
      } finally {
        if (myRequest === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [tab, islamicSub, debouncedQuery, user]
  );

  useEffect(() => {
    load(1, true);
  }, [load]);

  // Load Soundstripe playlists.
  useEffect(() => {
    if (tab !== "SOUNDSTRIPE") return;

    let cancelled = false;

    const fetchPlaylists = async () => {
      setSoundstripeLoading(true);
      setSoundstripeError(null);

      try {
        const response = await api.sounds.soundstripePlaylists(1, 20);

        if (!cancelled) {
          setSoundstripePlaylists(response.data ?? []);
          setSoundstripeIncluded(response.included ?? []);
          setSelectedPlaylist(null);

          console.log("PLAYLIST COUNT:", response.data?.length);

          console.log(
            "FIRST PLAYLIST RELATIONSHIPS:",
            JSON.stringify(
              response.data?.[0]?.relationships ?? {},
              null,
              2
            )
          );

          console.log(
            "SONG DATA:",
            JSON.stringify(
              (response.included ?? [])
                .filter((item) =>
                  item.type.toLowerCase().includes("song")
                )
                .slice(0, 2)
                .map((item) => ({
                  id: item.id,
                  type: item.type,
                  attributes: item.attributes,
                  relationshipKeys: Object.keys(
                    item.relationships ?? {}
                  ),
                })),
              null,
              2
            )
          );
        }
      } catch (error) {
        if (!cancelled) {
          setSoundstripeError(
            error instanceof Error
              ? error.message
              : "Couldn't load Soundstripe playlists."
          );
        }
      } finally {
        if (!cancelled) {
          setSoundstripeLoading(false);
        }
      }
    };

    fetchPlaylists();

    return () => {
      cancelled = true;
    };
  }, [tab]);

  // Trending rail shown above the list on the All tab.
  useEffect(() => {
    if (tab !== "ALL" || debouncedQuery) return;

    api.sounds
      .trending({ limit: 10 })
      .then((res) => setTrending(res.items))
      .catch(() => {});
  }, [tab, debouncedQuery]);

  const onEndReached = () => {
    if (loading || loadingMore || page >= totalPages) return;
    load(page + 1, false);
  };

  const subcategoryChips = useMemo<
    { key: IslamicSubcategory | null; label: string; emoji: string }[]
  >(
    () => [
      { key: null, label: "All Islamic", emoji: "🕌" },
      ...ISLAMIC_SUBCATEGORIES,
    ],
    []
  );

  // Find songs connected to the selected playlist.
  const selectedPlaylistSongs = useMemo(() => {
    if (!selectedPlaylist) return [];

    const relationships = selectedPlaylist.relationships ?? {};

    const possibleSongRelationships = [
      "songs",
      "tracks",
      "items",
      "playlist_tracks",
      "playlistTracks",
    ];

    let relatedIds: string[] = [];

    for (const key of possibleSongRelationships) {
      const relationship = relationships[key] as
        | {
            data?: Array<{ id: string; type?: string }>;
          }
        | undefined;

      if (relationship?.data?.length) {
        relatedIds = relationship.data.map((resource) => resource.id);
        break;
      }
    }

    return soundstripeIncluded.filter(
      (resource) =>
        resource.type.toLowerCase().includes("song") &&
        relatedIds.includes(resource.id)
    );
  }, [selectedPlaylist, soundstripeIncluded]);

  const getResourceTitle = (resource: SoundstripeResource) =>
    String(
      resource.attributes["title"] ??
        resource.attributes["name"] ??
        "Untitled Song"
    );


  const getResourceAudioUrl = (resource: SoundstripeResource): string | undefined => {
    const relationship = resource.relationships?.["audio_files"] as { data?: Array<{ id: string }> } | undefined;
    const audioFile = soundstripeIncluded.find((entry) => entry.type === "audio_files" && relationship?.data?.some((audio) => audio.id === entry.id));
    if (!audioFile) return undefined;

    const attributes = audioFile.attributes;
    const versions = attributes["versions"];
    const candidates: unknown[] = [
      versions && typeof versions === "object" ? (versions as Record<string, unknown>)["mp3"] : undefined,
      attributes["mp3"], attributes["preview_url"], attributes["audio_url"], attributes["url"], attributes["download_url"], attributes["stream_url"],
    ];
    const findUrl = (value: unknown, depth = 0): string | undefined => {
      if (depth > 5 || value == null) return undefined;
      if (typeof value === "string") return /^https?:\/\//i.test(value) ? value : undefined;
      if (Array.isArray(value)) {
        for (const entry of value) { const found = findUrl(entry, depth + 1); if (found) return found; }
      } else if (typeof value === "object") {
        const record = value as Record<string, unknown>;
        for (const key of ["url", "src", "href", "mp3", "preview_url", "audio_url"]) {
          const found = findUrl(record[key], depth + 1); if (found) return found;
        }
      }
      return undefined;
    };
    for (const candidate of candidates) { const found = findUrl(candidate); if (found) return found; }
    return findUrl(attributes);
  };

  return (
    <Screen edges={["top"]} padded={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons
            name="chevron-back"
            size={26}
            color={theme.textPrimary}
          />
        </Pressable>

        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Sound Library
        </Text>

        <View style={{ width: 26 }} />
      </View>

      <View style={styles.searchWrap}>
        <GlassSurface
          style={styles.searchBar}
          strength="subtle"
          elevated={false}
        >
          <Ionicons name="search" size={18} color={theme.textMuted} />

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search songs, artists, Surah, reciter…"
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.textPrimary }]}
            returnKeyType="search"
          />

          {!!query && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons
                name="close-circle"
                size={18}
                color={theme.textMuted}
              />
            </Pressable>
          )}
        </GlassSurface>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsRow}
        contentContainerStyle={{ paddingHorizontal: spacing.lg }}
      >
        {LIBRARY_TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => {
              setTab(t.key);
              if (t.key !== "ISLAMIC") setIslamicSub(null);
              if (t.key !== "SOUNDSTRIPE") setSelectedPlaylist(null);
            }}
            style={[
              styles.tabChip,
              {
                backgroundColor:
                  tab === t.key ? theme.accent : theme.surfaceAlt,
                borderColor:
                  tab === t.key ? theme.accent : theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.tabChipLabel,
                {
                  color:
                    tab === t.key ? theme.onAccent : theme.textSecondary,
                },
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {tab === "ISLAMIC" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.subTabsRow}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        >
          {subcategoryChips.map((c) => (
            <MoodChip
              key={c.key ?? "all"}
              emoji={c.emoji}
              label={c.label}
              selected={islamicSub === c.key}
              onPress={() => setIslamicSub(c.key)}
            />
          ))}
        </ScrollView>
      )}

      {tab === "SOUNDSTRIPE" ? (
        soundstripeLoading ? (
          <View
            style={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
            }}
          >
            <SoundSkeletonList count={6} />
          </View>
        ) : soundstripeError ? (
          <SoundEmptyState
            icon="alert-circle-outline"
            title="Couldn't load Soundstripe"
            subtitle={soundstripeError}
          />
        ) : selectedPlaylist ? (
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                gap: spacing.sm,
              }}
            >
              <Pressable
                onPress={() => setSelectedPlaylist(null)}
                hitSlop={8}
                style={{ padding: spacing.xs }}
              >
                <Ionicons
                  name="arrow-back"
                  size={22}
                  color={theme.textPrimary}
                />
              </Pressable>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.textPrimary,
                    fontSize: 17,
                    fontWeight: "700",
                  }}
                >
                  {String(
                    selectedPlaylist.attributes["name"] ??
                      selectedPlaylist.attributes["title"] ??
                      "Playlist"
                  )}
                </Text>
                <Text
                  style={{
                    color: theme.textMuted,
                    marginTop: spacing.xs,
                  }}
                >
                  {selectedPlaylistSongs.length} songs
                </Text>
              </View>
            </View>

            <FlatList
              data={selectedPlaylistSongs}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{
                paddingHorizontal: spacing.lg,
                paddingBottom: spacing.xxxl,
                gap: spacing.sm,
              }}
              ListEmptyComponent={
                <SoundEmptyState
                  icon="musical-notes-outline"
                  title="Songs not found"
                  subtitle="The playlist's song relationship may use a different field. Check the FIRST PLAYLIST RELATIONSHIPS log in your Expo terminal."
                />
              }
              renderItem={({ item }) => (
                <SoundstripeSongRow
                  title={getResourceTitle(item)}
                  artist={String(item.attributes["artist_name"] ?? "")}
                  audioUrl={getResourceAudioUrl(item)}
                  theme={theme}
                />
              )}
            />
          </View>
        ) : (
          <FlatList
            data={soundstripePlaylists}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              paddingBottom: spacing.xxxl,
              gap: spacing.sm,
            }}
            ListEmptyComponent={
              <SoundEmptyState
                icon="musical-notes-outline"
                title="No playlists found"
                subtitle="Soundstripe playlists will appear here when available."
              />
            }
            renderItem={({ item }) => (
              <Pressable
                style={{
                  padding: spacing.lg,
                  borderRadius: radius.lg,
                  backgroundColor: theme.surfaceAlt,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                onPress={() => setSelectedPlaylist(item)}
              >
                <Text
                  style={{
                    color: theme.textPrimary,
                    fontSize: 16,
                    fontWeight: "700",
                  }}
                >
                  {String(
                    item.attributes["name"] ??
                      item.attributes["title"] ??
                      "Untitled Playlist"
                  )}
                </Text>

                <Text
                  style={{
                    color: theme.textMuted,
                    marginTop: spacing.xs,
                  }}
                >
                  Tap to explore playlist
                </Text>
              </Pressable>
            )}
          />
        )
      ) : loading ? (
        <View
          style={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
          }}
        >
          <SoundSkeletonList count={6} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: spacing.xxxl,
            gap: spacing.sm,
          }}
          onEndReachedThreshold={0.4}
          onEndReached={onEndReached}
          ListHeaderComponent={
            tab === "ALL" && !debouncedQuery && trending.length > 0 ? (
              <View style={{ marginBottom: spacing.lg }}>
                <View style={styles.sectionHeaderRow}>
                  <Text
                    style={[
                      styles.sectionHeader,
                      { color: theme.textPrimary },
                    ]}
                  >
                    🔥 Trending Sounds
                  </Text>

                  <Pressable onPress={() => setTab("TRENDING")}>
                    <Text style={[styles.seeAll, { color: theme.accent }]}>
                      See all
                    </Text>
                  </Pressable>
                </View>

                <FlatList
                  data={trending}
                  keyExtractor={(item) => `trend-${item.id}`}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <SoundCard sound={item} variant="compact" />
                  )}
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            error ? (
              <SoundEmptyState
                icon="alert-circle-outline"
                title="Something went wrong"
                subtitle={error}
              />
            ) : tab === "FAVORITES" && (!user || user.isGuest) ? (
              <SoundEmptyState
                icon="lock-closed-outline"
                title="Sign up to save favorites"
                subtitle="Your favorited sounds are saved to your account."
              />
            ) : debouncedQuery ? (
              <SoundEmptyState
                icon="search-outline"
                title="No results found"
                subtitle={`No sounds match "${debouncedQuery}"`}
              />
            ) : tab === "FAVORITES" ? (
              <SoundEmptyState
                icon="heart-outline"
                title="No favorites yet"
                subtitle="Tap the heart on any sound to save it here."
              />
            ) : (
              <SoundEmptyState
                icon="musical-notes-outline"
                title="No sounds yet"
                subtitle="Check back soon for new sounds."
              />
            )
          }
          ListFooterComponent={
            loadingMore ? <SoundSkeletonList count={2} /> : null
          }
          renderItem={({ item }) => <SoundCard sound={item} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: { ...typography.h3 },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchInput: { flex: 1, ...typography.body, fontSize: 14 },
  tabsRow: { flexGrow: 0, marginBottom: spacing.sm },
  tabChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginRight: spacing.sm,
  },
  tabChipLabel: { ...typography.caption, fontWeight: "700" },
  subTabsRow: { flexGrow: 0, marginBottom: spacing.md },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionHeader: { ...typography.bodyStrong, fontSize: 16 },
  seeAll: { ...typography.caption, fontWeight: "700" },
});
