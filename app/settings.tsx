import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { useAppTheme } from "@/theme/ThemeProvider";
import { radius, spacing, typography } from "@/theme/tokens";
import { useAuth } from "@/context/AuthContext";
import type { NotificationPrefs } from "@/services/api";

const THEME_OPTIONS: { key: "light" | "dark" | "system"; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "light", label: "Light", icon: "sunny-outline" },
  { key: "dark", label: "Dark", icon: "moon-outline" },
  { key: "system", label: "System", icon: "phone-portrait-outline" },
];

const NOTIFICATION_TOGGLES: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  { key: "favorites", label: "Favorites", description: "When someone favorites your status" },
  { key: "newFromCreator", label: "New from creators", description: "When someone you follow posts" },
  { key: "trending", label: "Trending", description: "When your status is getting popular" },
  { key: "system", label: "App updates", description: "Announcements from Status App" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { theme } = useAppTheme();
  return <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>{children}</Text>;
}

export default function Settings() {
  const { theme, preference, setPreference } = useAppTheme();
  const { user, logout, updateNotificationPrefs } = useAuth();

  const confirmLogout = () => {
    Alert.alert("Log out?", "You can always sign back in.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <Screen edges={["top"]}>
      <View style={styles.headerRow}>
        <Ionicons name="chevron-back" size={26} color={theme.textPrimary} onPress={() => router.back()} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <SectionLabel>Appearance</SectionLabel>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((opt) => {
              const selected = preference === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setPreference(opt.key)}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: selected ? theme.accent : theme.surfaceAlt,
                      borderColor: selected ? theme.accent : theme.border,
                    },
                  ]}
                >
                  <Ionicons name={opt.icon} size={18} color={selected ? "#fff" : theme.textSecondary} />
                  <Text style={[styles.themeOptionText, { color: selected ? "#fff" : theme.textSecondary }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <SectionLabel>Notifications</SectionLabel>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {user?.isGuest ? (
            <Text style={[styles.guestNote, { color: theme.textMuted }]}>
              Create an account to manage notification preferences.
            </Text>
          ) : (
            NOTIFICATION_TOGGLES.map((toggle, i) => (
              <View
                key={toggle.key}
                style={[
                  styles.toggleRow,
                  i < NOTIFICATION_TOGGLES.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleLabel, { color: theme.textPrimary }]}>{toggle.label}</Text>
                  <Text style={[styles.toggleDescription, { color: theme.textMuted }]}>{toggle.description}</Text>
                </View>
                <Switch
                  value={user?.notificationPrefs[toggle.key] ?? true}
                  onValueChange={(value) => updateNotificationPrefs({ [toggle.key]: value })}
                  trackColor={{ true: theme.accent, false: theme.border }}
                  thumbColor="#fff"
                />
              </View>
            ))
          )}
        </View>

        <SectionLabel>About</SectionLabel>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Pressable style={styles.linkRow} onPress={() => router.push("/privacy")}>
            <Text style={[styles.linkText, { color: theme.textPrimary }]}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable style={styles.linkRow} onPress={() => router.push("/terms")}>
            <Text style={[styles.linkText, { color: theme.textPrimary }]}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </Pressable>
        </View>

        {!user?.isGuest && (
          <Pressable style={[styles.logoutButton, { borderColor: theme.danger }]} onPress={confirmLogout}>
            <Text style={[styles.logoutText, { color: theme.danger }]}>Log Out</Text>
          </Pressable>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md, marginBottom: spacing.md },
  title: { ...typography.h2 },
  sectionLabel: { ...typography.caption, textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.xl, marginBottom: spacing.sm },
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: "hidden" },
  themeRow: { flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  themeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  themeOptionText: { ...typography.caption },
  toggleRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  toggleLabel: { ...typography.bodyStrong },
  toggleDescription: { ...typography.tiny, marginTop: 2 },
  guestNote: { ...typography.body, padding: spacing.lg },
  linkRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  linkText: { ...typography.body },
  divider: { height: 1 },
  logoutButton: {
    marginTop: spacing.xl,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  logoutText: { ...typography.bodyStrong },
});
