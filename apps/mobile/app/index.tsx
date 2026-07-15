import { Redirect } from "expo-router";

// Root redirect — AuthGate in _layout.tsx handles actual routing based on auth state
export default function Index() {
  return <Redirect href="/auth/welcome" />;
}
