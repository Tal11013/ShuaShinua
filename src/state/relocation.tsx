import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type AuthenticatedUser,
  type BoxType,
  type IdfGroup,
  type Item,
  type Location,
  type MovingType,
  type MovingUnit,
  type PackingUnit,
  type Room,
} from "../../types";
import type { RelocationData } from "../domain/seed";

const USER_STORAGE_KEY = "relocation-user-id";

type RelocationContextValue = RelocationData & {
  currentUser: AuthenticatedUser | null;
  users: AuthenticatedUser[];
  loading: boolean;
  error: string | null;
  submitting: boolean;
  login: (personalNumber: string) => Promise<boolean>;
  logout: () => void;
  setUserId: (userId: string) => void;
  reload: () => Promise<void>;
  createPacking: (payload: {
    unit_id: string;
    source_room_id: Room["room_id"];
    destination_room_id: Room["room_id"];
    box_type: BoxType;
    items: Array<{ catalog_id: Item["catalog_id"]; quantity: number }>;
  }) => Promise<boolean>;
  createTransport: (payload: {
    unit_id: string;
    moving_type: MovingType;
    vehicle_number: string;
    packing_ids: PackingUnit["packing_id"][];
  }) => Promise<boolean>;
  receiveTransport: (
    movingId: MovingUnit["moving_id"],
    packingIds: PackingUnit["packing_id"][],
  ) => Promise<boolean>;
  distributeUnit: (
    packingId: PackingUnit["packing_id"],
    itemIds: Item["catalog_id"][],
  ) => Promise<boolean>;
  resetAll: () => Promise<void>;
};

const emptyState: RelocationData = {
  groups: [],
  locations: [],
  rooms: [],
  units: [],
  transports: [],
  itemCatalogue: [],
};

const RelocationContext = createContext<RelocationContextValue | null>(null);

function getStoredUserId() {
  return localStorage.getItem(USER_STORAGE_KEY);
}

function normalizeState(state: RelocationData): RelocationData {
  return {
    ...state,
    transports: state.transports.map((transport) => ({
      ...transport,
      moving_date: new Date(transport.moving_date),
    })),
  };
}

async function readError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? "אירעה שגיאה.";
  } catch {
    return "אירעה שגיאה.";
  }
}

export function RelocationProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState<string | null>(getStoredUserId);
  const [state, setState] = useState<RelocationData>(emptyState);
  const [users, setUsers] = useState<AuthenticatedUser[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = useCallback(
    (path: string, init: RequestInit = {}) =>
      fetch(path, {
        ...init,
        headers: {
          "content-type": "application/json",
          ...(userId ? { "x-user-id": userId } : {}),
          ...init.headers,
        },
      }),
    [userId],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!userId) {
        setCurrentUser(null);
        setUsers([]);
        setState(emptyState);
        return;
      }

      const [meResponse, stateResponse] = await Promise.all([
        api("/api/me"),
        api("/api/state"),
      ]);

      if (!meResponse.ok) {
        throw new Error(await readError(meResponse));
      }

      if (!stateResponse.ok) {
        throw new Error(await readError(stateResponse));
      }

      const me = (await meResponse.json()) as {
        user: AuthenticatedUser;
        users: AuthenticatedUser[];
      };
      const scopedState = (await stateResponse.json()) as RelocationData;

      setCurrentUser(me.user);
      setUsers(me.users);
      setState(normalizeState(scopedState));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "אירעה שגיאה.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (userId) {
      localStorage.setItem(USER_STORAGE_KEY, userId);
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }

    void reload();
  }, [reload, userId]);

  const setUserId = useCallback((nextUserId: string) => {
    setUserIdState(nextUserId);
  }, []);

  const login = useCallback(async (personalNumber: string) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ personal_number: personalNumber }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const body = (await response.json()) as { user: AuthenticatedUser };

      localStorage.setItem(USER_STORAGE_KEY, body.user.user_id);
      setUserIdState(body.user.user_id);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "אירעה שגיאה.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(USER_STORAGE_KEY);
    setUserIdState(null);
    setCurrentUser(null);
    setUsers([]);
    setState(emptyState);
  }, []);

  const postAndReload = useCallback(
    async (path: string, payload: unknown) => {
      if (submitting) {
        return false;
      }

      setSubmitting(true);
      setError(null);

      try {
        const response = await api(path, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(await readError(response));
        }

        await reload();
        return true;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "אירעה שגיאה.");
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [api, reload, submitting],
  );

  const createPacking = useCallback(
    (payload: Parameters<RelocationContextValue["createPacking"]>[0]) =>
      postAndReload("/api/packing", payload),
    [postAndReload],
  );

  const createTransport = useCallback(
    (payload: Parameters<RelocationContextValue["createTransport"]>[0]) =>
      postAndReload("/api/transports", payload),
    [postAndReload],
  );

  const receiveTransport = useCallback(
    (moving_id: MovingUnit["moving_id"], packing_ids: PackingUnit["packing_id"][]) =>
      postAndReload("/api/receiving", { moving_id, packing_ids }),
    [postAndReload],
  );

  const distributeUnit = useCallback(
    (packing_id: PackingUnit["packing_id"], item_ids: Item["catalog_id"][]) =>
      postAndReload("/api/distribution", { packing_id, item_ids }),
    [postAndReload],
  );

  const resetAll = useCallback(async () => {
    await postAndReload("/api/reset", {});
  }, [postAndReload]);

  const value = useMemo(
    () => ({
      ...state,
      currentUser,
      users,
      loading,
      error,
      submitting,
      login,
      logout,
      setUserId,
      reload,
      createPacking,
      createTransport,
      receiveTransport,
      distributeUnit,
      resetAll,
    }),
    [
      createPacking,
      createTransport,
      currentUser,
      distributeUnit,
      error,
      loading,
      login,
      logout,
      receiveTransport,
      reload,
      resetAll,
      setUserId,
      state,
      submitting,
      users,
    ],
  );

  return (
    <RelocationContext.Provider value={value}>
      {children}
    </RelocationContext.Provider>
  );
}

export function useRelocation() {
  const context = useContext(RelocationContext);

  if (!context) {
    throw new Error("useRelocation must be used inside RelocationProvider");
  }

  return context;
}
