import type {
  ItemStatus,
  MovingUnitStatus,
  PackingUnitStatus,
  RoomStatus,
} from "../../types";

const statusLabel: Record<string, string> = {
  WAITING_FOR_STATUS: "חדר פתוח",
  PACKING_PROCESS: "אריזה בתהליך",
  CLOSED_ROOM: "חדר סגור",
  WAITING_GRITA: "ממתין לגריטה",
  NOT_PACKED: "לא נארז",
  PACKED: "נארז",
  RECEIVED: "התקבל",
  MISSING: "חסר",
  DISTRIBUTED: "פוזר",
  WAITING_FOR_PACKING: "ממתין לאריזה",
  PACKING_RECEIVED: "אריזה התקבלה",
  PACKING_CLOSED: "אריזה נסגרה",
  PACKING_ON_WAY: "אריזה בדרך",
  WAITING_FOR_MOVING: "ממתין להובלה",
  LOADING_PROCESS: "בתהליך העמסה",
  ON_WAY: "יחידת הובלה בדרך",
  UNLOADED_AT_DESTINATION: "יחידת הובלה נפרקה",
  CLOSED: "הובלה סגורה",
};

const statusTone: Record<string, string> = {
  WAITING_FOR_STATUS: "neutral",
  PACKING_PROCESS: "primary",
  CLOSED_ROOM: "success",
  WAITING_GRITA: "warning",
  NOT_PACKED: "neutral",
  PACKED: "primary",
  RECEIVED: "success",
  MISSING: "destructive",
  DISTRIBUTED: "success",
  WAITING_FOR_PACKING: "neutral",
  PACKING_RECEIVED: "success",
  PACKING_CLOSED: "success-soft",
  PACKING_ON_WAY: "warning",
  WAITING_FOR_MOVING: "neutral",
  LOADING_PROCESS: "primary",
  ON_WAY: "warning",
  UNLOADED_AT_DESTINATION: "success",
  CLOSED: "success-soft",
};

export function StatusChip({
  status,
}: {
  status:
    | ItemStatus
    | MovingUnitStatus
    | PackingUnitStatus
    | RoomStatus;
}) {
  return (
    <span className={`status-chip ${statusTone[status]}`}>
      {statusLabel[status]}
    </span>
  );
}

