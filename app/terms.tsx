import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { useAppTheme } from "@/theme/ThemeProvider";
import { spacing, typography } from "@/theme/tokens";

const SECTIONS = [
  {
    heading: "Uploading content",
    body: "You may only upload content you own or have permission to share. Status App does not encourage downloading or redistributing copyrighted material without the rights holder's permission (see spec section 29).",
  },
  {
    heading: "Prohibited content",
    body: "No violence, sexual content, harassment, or spam. Violating content will be removed and repeat violators may be banned. Use the Report button on any status to flag a problem.",
  },
  {
    heading: "Account responsibility",
    body: "You're responsible for activity on your account. Keep your password secure and let us know if you suspect unauthorized access.",
  },
  {
    heading: "Copyright / DMCA",
    body: "If you believe your copyrighted work was uploaded without permission, report the status in-app or contact copyright@statusapp.example.com with the details.",
  },
  {
    heading: "Changes",
    body: "We may update these terms as the app evolves. Continued use after changes means you accept the updated terms.",
  },
];

export default function Terms() {
  const { theme } = useAppTheme();
  return (
    <Screen edges={["top"]}>
      <View style={styles.headerRow}>
        <Ionicons name="chevron-back" size={26} color={theme.textPrimary} onPress={() => router.back()} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>Terms of Service</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <Text style={[styles.updated, { color: theme.textMuted }]}>Placeholder legal copy — replace with real terms reviewed by counsel before launch.</Text>
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
