import { RouterProvider } from "@tanstack/react-router";
import { RelocationProvider } from "./state/relocation";
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

  return <RouterProvider router={router} />;
}

export function App() {
  return (
    <RelocationProvider>
      <AuthGate />
    </RelocationProvider>
  );
}

