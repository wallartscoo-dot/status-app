import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { useAppTheme } from "@/theme/ThemeProvider";
import { spacing, typography } from "@/theme/tokens";

const SECTIONS = [
  {
    heading: "What we collect",
    body: "Your name, username, email, and content you upload or interact with (favorites, downloads, follows). We do not collect more than what's needed to run the app.",
  },
  {
    heading: "How we use it",
    body: "To run your account, show you relevant content, and improve recommendations. We never sell your personal data to third parties.",
  },
  {
    heading: "Content you upload",
    body: "You retain ownership of anything you upload. By publishing, you grant Status App a license to host and display it in the app. See the Copyright Policy for takedown requests.",
  },
  {
    heading: "Your choices",
    body: "You can edit or delete your profile, control notification preferences in Settings, and request account deletion at any time.",
  },
  {
    heading: "Contact",
    body: "Questions about this policy can be sent to privacy@statusapp.example.com.",
  },
];

export default function Privacy() {
  const { theme } = useAppTheme();
  return (
    <Screen edges={["top"]}>
      <View style={styles.headerRow}>
        <Ionicons name="chevron-back" size={26} color={theme.textPrimary} onPress={() => router.back()} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>Privacy Policy</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <Text style={[styles.updated, { color: theme.textMuted }]}>Last updated: this is placeholder legal copy — replace with real terms before launch.</Text>
        {SECTIONS.map((s) => (
          <View key={s.heading} style={{ marginTop: spacing.xl }}>
            <Text style={[styles.heading, { color: theme.textPrimary }]}>{s.heading}</Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md, marginBottom: spacing.md },
  title: { ...typography.h2 },
  updated: { ...typography.tiny },
  heading: { ...typography.h3, marginBottom: spacing.xs },
  body: { ...typography.body, lineHeight: 22 },
});
