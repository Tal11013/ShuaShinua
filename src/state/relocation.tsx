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
  ItemStatus,
  MovingUnitStatus,
  PackingUnitStatus,
  RoomStatus,
  type BoxType,
  type IdfGroup,
  type Item,
  type Location,
  type MovingType,
  type MovingUnit,
  type PackingUnit,
  type Room,
} from "../../types";
import { buildSeedState } from "./seed";

const STORAGE_KEY = "relocation-state-v1";

type RelocationState = {
  groups: IdfGroup[];
  locations: Location[];
  rooms: Room[];
  units: PackingUnit[];
  transports: MovingUnit[];
};

type RelocationContextValue = RelocationState & {
  createPacking: (
    roomId: Room["room_id"],
    boxType: BoxType,
    itemIds: Item["catalog_id"][],
  ) => void;
  createTransport: (
    movingType: MovingType,
    packingIds: PackingUnit["packing_id"][],
  ) => void;
  receiveTransport: (
    movingId: MovingUnit["moving_id"],
    packingIds: PackingUnit["packing_id"][],
  ) => void;
  distributeUnit: (
    packingId: PackingUnit["packing_id"],
    itemIds: Item["catalog_id"][],
  ) => void;
  resetAll: () => void;
};

const RelocationContext = createContext<RelocationContextValue | null>(null);

const cloneSeedState = (): RelocationState => buildSeedState();

const readInitialState = (): RelocationState => {
  if (typeof localStorage === "undefined") {
    return cloneSeedState();
  }

  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return cloneSeedState();
  }

  try {
    const parsed = JSON.parse(raw) as RelocationState;

    return {
      ...parsed,
      transports: parsed.transports.map((transport) => ({
        ...transport,
        moving_date: new Date(transport.moving_date),
      })),
    };
  } catch {
    return cloneSeedState();
  }
};

const createId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export function RelocationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RelocationState>(readInitialState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const createPacking = useCallback(
    (
      roomId: Room["room_id"],
      boxType: BoxType,
      itemIds: Item["catalog_id"][],
    ) => {
      setState((current) => {
        const room = current.rooms.find((candidate) => candidate.room_id === roomId);

        if (!room) {
          return current;
        }

        const selectedItems = room.items
          .filter((item) => itemIds.includes(item.catalog_id))
          .map((item) => ({ ...item, item_status: ItemStatus.PACKED }));

        if (selectedItems.length === 0) {
          return current;
        }

        const packedItemIds = new Set(selectedItems.map((item) => item.catalog_id));
        const isRoomClosed = room.items.every((item) => packedItemIds.has(item.catalog_id));

        return {
          ...current,
          rooms: current.rooms.map((candidate) =>
            candidate.room_id === roomId
              ? {
                  ...candidate,
                  items: candidate.items.map((item) =>
                    packedItemIds.has(item.catalog_id)
                      ? { ...item, item_status: ItemStatus.PACKED }
                      : item,
                  ),
                  room_status: isRoomClosed
                    ? RoomStatus.CLOSED_ROOM
                    : RoomStatus.PACKING_PROCESS,
                }
              : candidate,
          ),
          units: [
            ...current.units,
            {
              packing_id: createId("pack"),
              box_type: boxType,
              packing_status: PackingUnitStatus.PACKING_CLOSED,
              items: selectedItems,
            },
          ],
        };
      });
    },
    [],
  );

  const createTransport = useCallback(
    (movingType: MovingType, packingIds: PackingUnit["packing_id"][]) => {
      setState((current) => ({
        ...current,
        units: current.units.map((unit) =>
          packingIds.includes(unit.packing_id)
            ? { ...unit, packing_status: PackingUnitStatus.PACKING_ON_WAY }
            : unit,
        ),
        transports: [
          ...current.transports,
          {
            moving_id: createId("move"),
            moving_type: movingType,
            moving_status: MovingUnitStatus.ON_WAY,
            moving_date: new Date(),
          },
        ],
      }));
    },
    [],
  );

  const receiveTransport = useCallback(
    (
      movingId: MovingUnit["moving_id"],
      packingIds: PackingUnit["packing_id"][],
    ) => {
      setState((current) => ({
        ...current,
        units: current.units.map((unit) =>
          packingIds.includes(unit.packing_id)
            ? {
                ...unit,
                packing_status: PackingUnitStatus.PACKING_RECEIVED,
                items: unit.items.map((item) => ({
                  ...item,
                  item_status: ItemStatus.RECEIVED,
                })),
              }
            : unit,
        ),
        transports: current.transports.map((transport) =>
          transport.moving_id === movingId
            ? {
                ...transport,
                moving_status: MovingUnitStatus.UNLOADED_AT_DESTINATION,
              }
            : transport,
        ),
      }));
    },
    [],
  );

  const distributeUnit = useCallback(
    (
      packingId: PackingUnit["packing_id"],
      itemIds: Item["catalog_id"][],
    ) => {
      setState((current) => ({
        ...current,
        units: current.units.map((unit) =>
          unit.packing_id === packingId
            ? {
                ...unit,
                items: unit.items.map((item) =>
                  itemIds.includes(item.catalog_id)
                    ? { ...item, item_status: ItemStatus.DISTRIBUTED }
                    : item,
                ),
              }
            : unit,
        ),
      }));
    },
    [],
  );

  const resetAll = useCallback(() => {
    setState(cloneSeedState());
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      createPacking,
      createTransport,
      receiveTransport,
      distributeUnit,
      resetAll,
    }),
    [createPacking, createTransport, distributeUnit, receiveTransport, resetAll, state],
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

