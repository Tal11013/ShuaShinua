import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { canAccessManagementReport } from "../domain/users";
import { useRelocation } from "../state/relocation";

// Floating shortcut to the chat agent, on the side above the bottom nav.
// Managers only: the agent can query every group's data, which workers
// aren't scoped to see (the API enforces the same rule).
export function ChatFab() {
  const { currentUser } = useRelocation();

  if (!currentUser || !canAccessManagementReport(currentUser)) {
    return null;
  }

  return (
    <Link className="chat-fab" to="/chat" aria-label="פתיחת סוכן AI">
      <MessageCircle aria-hidden="true" size={26} />
    </Link>
  );
}
