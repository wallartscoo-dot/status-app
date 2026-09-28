import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time errors anywhere below it in the tree and shows a
 * recoverable screen instead of a white screen / native crash (spec section
 * 22: "Do not leave screens blank" applies to failure states too, not just
 * loading states). Does NOT catch errors in event handlers, async code, or
 * outside React's render — those are handled by try/catch + the error
 * states already built into each screen's data-fetching hooks.
 *
 * In production this should also report `error` to a crash-reporting
 * service (Sentry, Bugsnag, etc.) inside componentDidCatch — left as a
 * clearly-marked hook point below rather than wired to a specific vendor.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
    // TODO: report to a crash-reporting service in production, e.g.:
    // Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>😕</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            An unexpected error occurred. Try again, or restart the app if it keeps happening.
          </Text>
          <Pressable style={styles.button} onPress={this.reset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

// Static, theme-independent styling: a crashed tree can't reliably reach
// ThemeProvider's context, so this screen intentionally does not use
// useAppTheme() and instead ships its own minimal dark-friendly palette.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B0B14",
    paddingHorizontal: 32,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "700", color: "#FFFFFF", marginBottom: 8 },
  message: { fontSize: 14, color: "#C6C6D6", textAlign: "center", marginBottom: 24, lineHeight: 20 },
  button: { backgroundColor: "#7C5CFC", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 },
  buttonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 15 },
});
