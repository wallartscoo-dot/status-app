import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/theme/ThemeProvider";
import { darkTheme } from "@/theme/colors";

/**
 * Floating liquid-glass tab bar: Home · Explore · [ + ] · Messages · Profile
 * DESIGN ONLY — navigation works exactly like the default tab bar (same
 * routes, same tabPress events).
 */

const LIME = "#C1FF72";
type IconName = React.ComponentProps<typeof Ionicons>["name"];

const ICONS: Record<string, { on: IconName; off: IconName }> = {
  home: { on: "home", off: "home-outline" },
  explore: { on: "compass", off: "compass-outline" },
  messages: { on: "paper-plane", off: "paper-plane-outline" },
  profile: { on: "person", off: "person-outline" },
};
const CREATE_ROUTE = "create";
/** Screens with full-screen video behind them — bar floats over the video in dark glass. */
const OVERLAY_ROUTES = ["home"];

type Props = {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    emit: (e: { type: "tabPress"; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: never) => void;
  };
};

export function FloatingTabBar({ state, descriptors, navigation }: Props) {
  const { theme: appTheme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  const overlay = OVERLAY_ROUTES.includes(current);
  const theme = overlay ? darkTheme : appTheme;
  const g = theme.glass;
  const dark = theme.mode === "dark";

  const go = (key: string, name: string, focused: boolean) => {
    const e = navigation.emit({ type: "tabPress", target: key, canPreventDefault: true });
    if (!focused && !e.defaultPrevented) navigation.navigate(name as never);
  };

  return (
    <View
      style={[
        overlay ? styles.wrapOverlay : [styles.wrapInline, { backgroundColor: appTheme.background }],
        { paddingBottom: Math.max(insets.bottom - 6, 12) },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.pill, { borderColor: g.borderStrong }]}>
        <BlurView
          intensity={g.intensityStrong}
          tint={g.tint}
          experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: g.fillStrong }]} />

        {state.routes.map((route, i) => {
          const focused = state.index === i;

          if (route.name === CREATE_ROUTE) {
            return (
              <Pressable
                key={route.key}
                onPress={() => go(route.key, route.name, focused)}
                style={({ pressed }) => [styles.create, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}
                accessibilityLabel="Create"
              >
                <View style={[styles.createLayer, { left: 0, backgroundColor: LIME }]} />
                <View style={[styles.createLayer, { right: 0, backgroundColor: dark ? "#8FD83A" : "#0C0C0C" }]} />
                <View style={[styles.createLayer, styles.createFace]}>
                  <Ionicons name="add" size={24} color="#0C0C0C" />
                </View>
              </Pressable>
            );
          }

          const icons = ICONS[route.name] ?? { on: "ellipse", off: "ellipse-outline" };
          const label = descriptors[route.key]?.options.title ?? route.name;
          const tint = focused ? (dark ? LIME : theme.onAccent) : theme.textMuted;

          return (
            <Pressable
              key={route.key}
              onPress={() => go(route.key, route.name, focused)}
              style={[
                styles.tab,
                focused &&
                  (dark
                    ? { backgroundColor: "rgba(193,255,114,0.16)", borderColor: "rgba(193,255,114,0.45)" }
                    : { backgroundColor: theme.accent, borderColor: theme.accent }),
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
            >
              <Ionicons name={focused ? icons.on : icons.off} size={20} color={tint} />
              <Text style={[styles.label, { color: focused && !dark ? "#FFFFFF" : tint }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapOverlay: { position: "absolute", left: 12, right: 12, bottom: 0 },
  wrapInline: { paddingHorizontal: 12, paddingTop: 6 },
  pill: {
    height: 64,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
    gap: 2,
  },
  tab: {
    flex: 1,
    height: "100%",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: "transparent",
  },
  label: { fontSize: 10, fontWeight: "700" },
  create: { width: 56, height: 38, marginHorizontal: 4 },
  createLayer: { position: "absolute", top: 0, width: 48, height: 38, borderRadius: 12 },
  createFace: { left: 4, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
});
