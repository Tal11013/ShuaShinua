import { RouterProvider } from "@tanstack/react-router";
import { RelocationProvider } from "./state/relocation";
import { ToastProvider } from "./state/toast";
import { router } from "./router";
import { LoginRoute } from "./routes/LoginRoute";
import { useRelocation } from "./state/relocation";

function AuthGate() {
  const { currentUser, loading } = useRelocation();

  if (loading && !currentUser) {
    return <main className="login-shell">טוען...</main>;
  }

  if (!currentUser) {
    return <LoginRoute />;
  }

  return (
    // Mounted outside the router's outlet so a toast keeps running across
    // route navigations instead of unmounting with the screen that raised it.
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}

export function App() {
  return (
    <RelocationProvider>
      <AuthGate />
    </RelocationProvider>
  );
}
