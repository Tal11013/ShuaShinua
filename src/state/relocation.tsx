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
  type CatalogueItem,
  type IdfGroup,
  type Item,
  type Location,
  type MovingType,
  type MovingUnit,
  type PackingUnit,
  type Room,
} from "../../types";
import { apiUrl } from "../lib/api";

const USER_STORAGE_KEY = "relocation-user-id";

// The shape of GET /api/state.
export type RelocationData = {
  groups: IdfGroup[];
  locations: Location[];
  rooms: Room[];
  units: PackingUnit[];
  transports: MovingUnit[];
  itemCatalogue: CatalogueItem[];
};

type RelocationContextValue = RelocationData & {
  currentUser: AuthenticatedUser | null;
  loading: boolean;
  error: string | null;
  submitting: boolean;
  login: (identityNum: string) => Promise<boolean>;
  logout: () => void;
  reload: () => Promise<void>;
  api: (path: string, init?: RequestInit) => Promise<Response>;
  createPacking: (payload: {
    source_room_id: Room["room_id"];
    destination_room_id: Room["room_id"];
    box_type: BoxType;
    items: Array<{ catalog_id: CatalogueItem["catalog_id"]; quantity: number }>;
  }) => Promise<boolean>;
  createTransport: (payload: {
    moving_type: MovingType;
    vehicle_number?: string;
    vehicle_details?: string;
    packing_ids: PackingUnit["packing_id"][];
  }) => Promise<boolean>;
  receiveTransport: (
    movingId: MovingUnit["moving_id"],
    packingIds: PackingUnit["packing_id"][],
  ) => Promise<boolean>;
  distributeUnit: (
    packingId: PackingUnit["packing_id"],
    itemIds: Item["item_id"][],
  ) => Promise<boolean>;
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
  try {
    return localStorage.getItem(USER_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeUserId(userId: string | null) {
  try {
    if (userId) {
      localStorage.setItem(USER_STORAGE_KEY, userId);
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch {
    // Storage unavailable: the session just won't survive a reload.
  }
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

class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function readError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return new ApiError(response.status, body.error ?? "אירעה שגיאה.");
  } catch {
    return new ApiError(response.status, "אירעה שגיאה.");
  }
}

export function RelocationProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(getStoredUserId);
  const [state, setState] = useState<RelocationData>(emptyState);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    storeUserId(null);
    setUserId(null);
    setCurrentUser(null);
    setState(emptyState);
  }, []);

  const api = useCallback(
    (path: string, init: RequestInit = {}) =>
      fetch(apiUrl(path), {
        ...init,
        headers: {
          "content-type": "application/json",
          ...(userId ? { "x-user-id": userId } : {}),
          ...init.headers,
        },
      }),
    [userId],
  );

  // Surfaces an API failure; an unknown/removed user is logged out.
  const handleError = useCallback(
    (caught: unknown) => {
      if (caught instanceof ApiError && caught.status === 401) {
        logout();
      }
      setError(caught instanceof Error ? caught.message : "אירעה שגיאה.");
    },
    [logout],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!userId) {
        setCurrentUser(null);
        setState(emptyState);
        return;
      }

      const [meResponse, stateResponse] = await Promise.all([
        api("/api/me"),
        api("/api/state"),
      ]);

      if (!meResponse.ok) {
        throw await readError(meResponse);
      }

      if (!stateResponse.ok) {
        throw await readError(stateResponse);
      }

      const me = (await meResponse.json()) as { user: AuthenticatedUser };
      const scopedState = (await stateResponse.json()) as RelocationData;

      setCurrentUser(me.user);
      setState(normalizeState(scopedState));
    } catch (caught) {
      handleError(caught);
    } finally {
      setLoading(false);
    }
  }, [api, handleError, userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const login = useCallback(async (identityNum: string) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(apiUrl("/api/login"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identity_num: identityNum }),
      });

      if (!response.ok) {
        throw await readError(response);
      }

      const body = (await response.json()) as { user: AuthenticatedUser };

      storeUserId(body.user.user_id);
      setUserId(body.user.user_id);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "אירעה שגיאה.");
      return false;
    } finally {
      setSubmitting(false);
    }
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
          throw await readError(response);
        }

        await reload();
        return true;
      } catch (caught) {
        handleError(caught);
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [api, handleError, reload, submitting],
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
    (packing_id: PackingUnit["packing_id"], item_ids: Item["item_id"][]) =>
      postAndReload("/api/distribution", { packing_id, item_ids }),
    [postAndReload],
  );

  const value = useMemo(
    () => ({
      ...state,
      currentUser,
      loading,
      error,
      submitting,
      login,
      logout,
      reload,
      api,
      createPacking,
      createTransport,
      receiveTransport,
      distributeUnit,
    }),
    [
      api,
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
      state,
      submitting,
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
