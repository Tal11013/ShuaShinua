import { useNavigate } from "@tanstack/react-router";
import Chat from "../components/Chat";

export function ChatRoute() {
  const navigate = useNavigate();

  return (
    <div style={{ 
      height: "100dvh", 
      maxWidth: "480px", 
      margin: "0 auto",
      display: "flex", 
      flexDirection: "column", 
      backgroundColor: "#f5f5f5",
      boxShadow: "0 0 20px rgba(0,0,0,0.1)"
    }}>
      <header style={{ 
        display: "flex", 
        alignItems: "center", 
        padding: "1rem", 
        backgroundColor: "#1976d2", 
        color: "white",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        zIndex: 10
      }}>
        <button 
          onClick={() => navigate({ to: "/management" })}
          style={{ 
            background: "none", 
            border: "none", 
            color: "white", 
            fontSize: "1.2rem", 
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <span>← חזור</span>
        </button>
        <h1 style={{ margin: "0 auto", fontSize: "1.2rem", fontWeight: "600", transform: "translateX(-20px)" }}>סוכן לוגיסטיקה חכם</h1>
      </header>
      <main style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        <Chat />
      </main>
    </div>
  );
}
