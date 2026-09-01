import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/theme/ThemeProvider";
import { ALL_CATEGORIES } from "@/constants/categories";
import { spacing, radius, typography } from "@/theme/tokens";
import { api, ApiError } from "@/services/api";
import { track } from "@/utils/analytics";

type PickedMedia = {
  uri: string;
  type: "VIDEO" | "IMAGE";
  fileName: string;
  mimeType: string;
  durationSec?: number;
};

type Step = "pick" | "details" | "preview";

export default function Create() {
  const { theme } = useAppTheme();
  const { user, refreshProfile } = useAuth();

  const [step, setStep] = useState<Step>("pick");
  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryKey, setCategoryKey] = useState<string | null>(null);
  const [hashtags, setHashtags] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep("pick");
    setMedia(null);
    setTitle("");
    setDescription("");
    setCategoryKey(null);
    setHashtags("");
    setError(null);
  };

  if (!user || user.isGuest) {
    return (
      <Screen style={styles.center}>
        <Ionicons name="lock-closed-outline" size={40} color={theme.textMuted} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>Sign up to upload</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Creating your own statuses is available to registered users.
        </Text>
        <View style={{ height: spacing.lg }} />
        <Button label="Create Account" onPress={() => router.push("/(auth)/signup")} />
      </Screen>
    );
  }

  const pickMedia = async (source: "library" | "camera", kind: "VIDEO" | "IMAGE") => {
    setError(null);
    const permission =
      source === "library"
        ? await ImagePicker.requestMediaLibraryPermissionsAsync()
        : await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Permission denied. Enable photo/camera access in Settings to continue.");
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: kind === "VIDEO" ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      videoMaxDuration: 30, // spec section 6: statuses are ~30 seconds max
    };

    const result =
      source === "library"
        ? await ImagePicker.launchImageLibraryAsync(options)
        : await ImagePicker.launchCameraAsync(options);

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    if (kind === "VIDEO" && asset.duration && asset.duration / 1000 > 30) {
      setError("Videos must be 30 seconds or shorter.");
      return;
    }

    setMedia({
      uri: asset.uri,
      type: kind,
      fileName: asset.fileName ?? `status.${kind === "VIDEO" ? "mp4" : "jpg"}`,
      mimeType: asset.mimeType ?? (kind === "VIDEO" ? "video/mp4" : "image/jpeg"),
      durationSec: asset.duration ? Math.round(asset.duration / 1000) : undefined,
    });
    setStep("details");
  };

  const goToPreview = () => {
    setError(null);
    if (!title.trim()) return setError("Title is required");
    if (!categoryKey) return setError("Choose a category");
    if (media?.type === "VIDEO" && !media.durationSec) return setError("Couldn't read video duration — try re-selecting");
    setStep("preview");
  };

  const publish = async () => {
    if (!media || !categoryKey) return;
    setPublishing(true);
    setError(null);
    try {
      await api.statuses.upload({
        uri: media.uri,
        fileName: media.fileName,
        mimeType: media.mimeType,
        title: title.trim(),
        description: description.trim() || undefined,
        type: media.type,
        categoryKey,
        durationSec: media.durationSec,
        hashtags: hashtags
          .split(/[,\s]+/)
          .map((t) => t.replace(/^#/, "").trim())
          .filter(Boolean),
      });
      track("status_published", { type: media.type, categoryKey });
      await refreshProfile(); // picks up the new totalUploads count
      reset();
      router.push("/(tabs)/profile");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Upload failed. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  // --- Step 1: pick media type + source ---
  if (step === "pick") {
    return (
      <Screen style={styles.center}>
        <Ionicons name="cloud-upload-outline" size={40} color={theme.accent} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>Upload a Status</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Share a video or image — up to 30 seconds for video.
        </Text>
        <View style={{ height: spacing.xl }} />

        <PickOption
          icon="videocam-outline"
          label="Upload Video"
          sublabel="From your library, up to 30s"
          onPress={() => pickMedia("library", "VIDEO")}
        />
        <PickOption
          icon="image-outline"
          label="Upload Image"
          sublabel="From your library"
          onPress={() => pickMedia("library", "IMAGE")}
        />
        <PickOption
          icon="camera-outline"
          label="Record with Camera"
          sublabel="Capture a new video"
          onPress={() => pickMedia("camera", "VIDEO")}
        />

        {!!error && <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>}
      </Screen>
    );
  }

  // --- Step 2: details form ---
  if (step === "details" && media) {
    return (
      <Screen edges={["top"]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Ionicons name="chevron-back" size={24} color={theme.textPrimary} onPress={reset} />
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Status Details</Text>
          </View>

          <Image source={{ uri: media.uri }} style={styles.detailsThumb} />

          <TextField label="Title" value={title} onChangeText={setTitle} placeholder="Give it a catchy title" maxLength={120} />
          <TextField
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="What's this status about?"
            maxLength={500}
            multiline
          />

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Category</Text>
          <View style={styles.categoryGrid}>
            {ALL_CATEGORIES.map((c) => (
              <Pressable
                key={c.key}
                onPress={() => setCategoryKey(c.key)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: categoryKey === c.key ? theme.accent : theme.surfaceAlt,
                    borderColor: categoryKey === c.key ? theme.accent : theme.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 14 }}>{c.emoji}</Text>
                <Text
                  style={[
                    styles.categoryChipLabel,
                    { color: categoryKey === c.key ? "#fff" : theme.textSecondary },
                  ]}
                >
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextField
            label="Hashtags (optional)"
            value={hashtags}
            onChangeText={setHashtags}
            placeholder="love, mood, trending"
          />

          {!!error && <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>}

          <Button label="Preview" onPress={goToPreview} style={{ marginTop: spacing.md, marginBottom: spacing.xxl }} />
        </ScrollView>
      </Screen>
    );
  }

  // --- Step 3: preview + publish ---
  if (step === "preview" && media) {
    return (
      <Screen edges={["top"]}>
        <View style={styles.headerRow}>
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} onPress={() => setStep("details")} />
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Preview</Text>
        </View>

        <View style={styles.previewCard}>
          <Image source={{ uri: media.uri }} style={styles.previewThumb} />
          {media.type === "VIDEO" && (
            <View style={styles.previewPlayBadge}>
              <Ionicons name="play" size={20} color="#fff" />
            </View>
          )}
        </View>

        <Text style={[styles.previewTitle, { color: theme.textPrimary }]}>{title}</Text>
        {!!description && (
          <Text style={[styles.previewDescription, { color: theme.textSecondary }]}>{description}</Text>
        )}
        <Text style={[styles.previewMeta, { color: theme.textMuted }]}>
          {ALL_CATEGORIES.find((c) => c.key === categoryKey)?.emoji}{" "}
          {ALL_CATEGORIES.find((c) => c.key === categoryKey)?.label}
          {media.durationSec ? `  ·  ${media.durationSec}s` : ""}
        </Text>

        {!!error && <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>}

        <Button
          label={publishing ? "Publishing…" : "Publish Status"}
          onPress={publish}
          loading={publishing}
          style={{ marginTop: spacing.xl }}
        />
      </Screen>
    );
  }

  return null;
}

function PickOption({
  icon,
  label,
  sublabel,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel: string;
  onPress: () => void;
}) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pickOption, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <View style={[styles.pickIconWrap, { backgroundColor: theme.surfaceAlt }]}>
        <Ionicons name={icon} size={22} color={theme.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.pickLabel, { color: theme.textPrimary }]}>{label}</Text>
        <Text style={[styles.pickSublabel, { color: theme.textMuted }]}>{sublabel}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  title: { ...typography.h2, marginTop: spacing.lg, textAlign: "center" },
  subtitle: { ...typography.body, marginTop: spacing.sm, textAlign: "center", paddingHorizontal: spacing.lg },
  errorText: { ...typography.body, marginTop: spacing.md, textAlign: "center", paddingHorizontal: spacing.lg },
  pickOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    width: "100%",
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pickIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  pickLabel: { ...typography.bodyStrong },
  pickSublabel: { ...typography.tiny, marginTop: 2 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md, marginBottom: spacing.lg },
  headerTitle: { ...typography.h3 },
  detailsThumb: { width: "100%", aspectRatio: 9 / 12, borderRadius: radius.lg, marginBottom: spacing.lg, backgroundColor: "#000" },
  fieldLabel: { ...typography.caption, marginBottom: spacing.sm },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  categoryChipLabel: { ...typography.tiny, fontWeight: "600" },
  previewCard: { width: "100%", aspectRatio: 9 / 14, borderRadius: radius.lg, overflow: "hidden", backgroundColor: "#000" },
  previewThumb: { width: "100%", height: "100%" },
  previewPlayBadge: {
    position: "absolute",
    top: "45%",
    left: "45%",
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  previewTitle: { ...typography.h3, marginTop: spacing.lg },
  previewDescription: { ...typography.body, marginTop: spacing.xs },
  previewMeta: { ...typography.caption, marginTop: spacing.sm },
});
