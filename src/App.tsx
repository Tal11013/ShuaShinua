import { RouterProvider } from "@tanstack/react-router";
import { RelocationProvider } from "./state/relocation";
import { router } from "./router";
import { LoginRoute } from "./routes/LoginRoute";
import { useRelocation } from "./state/relocation";
import Chat from "./components/Chat";

function AuthGate() {
  const { currentUser, loading } = useRelocation();

  if (loading && !currentUser) {
    return <main className="login-shell">טוען...</main>;
  }

  if (!currentUser) {
    return <LoginRoute />;
  }

  return (
    <>
      <RouterProvider router={router} />
      
      {/* Injected Chat Agent for testing after login */}
      <section className="chat-section" style={{ margin: "2rem", borderTop: "2px solid #ccc", paddingTop: "2rem" }}>
        <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>Logistics Agent</h2>
        <Chat />
      </section>
    </>
  );
}

export function App() {
  return (
    <RelocationProvider>
      <AuthGate />
    </RelocationProvider>
  );
}
