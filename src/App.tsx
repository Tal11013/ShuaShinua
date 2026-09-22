import { RouterProvider } from "@tanstack/react-router";
import { RelocationProvider } from "./state/relocation";
import { router } from "./router";

export function App() {
  return (
    <RelocationProvider>
      <RouterProvider router={router} />
    </RelocationProvider>
  );
}

