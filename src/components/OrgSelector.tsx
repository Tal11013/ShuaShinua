import type { IdfGroup } from "../../types";
import { getGroupLabel, getRoomLabel } from "../domain/display";
import { isSelectableRoom } from "../domain/validation";
import { useRelocation } from "../state/relocation";

export type OrgSelection = {
  unit_id: string;
  group_id: number | null;
  room_id: number | null;
};

export const emptyOrgSelection: OrgSelection = {
  unit_id: "",
  group_id: null,
  room_id: null,
};

// Preselects the unit and group when the user can only see one of each.
export function getInitialOrgSelection(groups: IdfGroup[]): OrgSelection {
  const unitIds = new Set(groups.map((group) => group.unit_id));
  const onlyGroup = groups.length === 1 ? groups[0]! : null;

  return {
    unit_id: unitIds.size === 1 ? [...unitIds][0]! : "",
    group_id: onlyGroup?.id ?? null,
    room_id: null,
  };
}

export function OrgSelector({
  title,
  value,
  onChange,
  disabled,
  unitLocked,
  roomLabel = "חדר",
}: {
  title: string;
  value: OrgSelection;
  onChange: (value: OrgSelection) => void;
  disabled?: boolean;
  // Destination rooms must be in the source room's unit.
  unitLocked?: boolean;
  roomLabel?: string;
}) {
  const { groups, locations, rooms } = useRelocation();
  const unitIds = Array.from(new Set(groups.map((group) => group.unit_id)));
  const unitGroups = groups.filter((group) => group.unit_id === value.unit_id);
  const selectableRooms = rooms.filter(
    (room) => room.group_id === value.group_id && isSelectableRoom(room),
  );

  return (
    <section className="org-selector" aria-label={title}>
      <label>
        יחידה
        <select
          disabled={disabled || unitLocked || unitIds.length <= 1}
          value={value.unit_id}
          onChange={(event) =>
            onChange({
              unit_id: event.target.value,
              group_id: null,
              room_id: null,
            })
          }
        >
          <option value="">בחר/י יחידה</option>
          {unitIds.map((unitId) => (
            <option key={unitId} value={unitId}>
              {unitId}
            </option>
          ))}
        </select>
      </label>
      <label>
        קבוצה
        <select
          disabled={disabled || !value.unit_id}
          value={value.group_id ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              group_id: event.target.value ? Number(event.target.value) : null,
              room_id: null,
            })
          }
        >
          <option value="">בחר/י קבוצה</option>
          {unitGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {getGroupLabel(group)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {roomLabel}
        <select
          disabled={disabled || value.group_id === null}
          value={value.room_id ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              room_id: event.target.value ? Number(event.target.value) : null,
            })
          }
        >
          <option value="">בחר/י חדר</option>
          {selectableRooms.map((room) => (
            <option key={room.room_id} value={room.room_id}>
              {getRoomLabel(locations, room)}
            </option>
          ))}
        </select>
      </label>
      {value.group_id !== null && selectableRooms.length === 0 ? (
        <p className="empty-state">אין בקבוצה זו חדרים זמינים (חדר חייב מיקום משויך).</p>
      ) : null}
    </section>
  );
}
