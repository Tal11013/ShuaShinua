import { UserRole, type Room } from "../../types";
import { isSelectableRoom } from "../domain/validation";
import { useRelocation } from "../state/relocation";

export type OrgSelection = {
  unit_id: string;
  branch: string;
  section: string;
  room_id: string;
};

export const emptyOrgSelection: OrgSelection = {
  unit_id: "",
  branch: "",
  section: "",
  room_id: "",
};

export function getInitialOrgSelection(
  currentUser: ReturnType<typeof useRelocation>["currentUser"],
) {
  return {
    unit_id: currentUser?.scope.unit_id ?? "",
    branch: currentUser?.scope.branch ?? "",
    section: currentUser?.scope.section ?? "",
    room_id: "",
  };
}

export function OrgSelector({
  title,
  value,
  onChange,
  disabled,
  roomLabel = "חדר",
}: {
  title: string;
  value: OrgSelection;
  onChange: (value: OrgSelection) => void;
  disabled?: boolean;
  roomLabel?: string;
}) {
  const { currentUser, groups, locations, rooms } = useRelocation();
  const userRole = currentUser?.role;
  const canViewUnit = userRole === UserRole.GLOBAL_MANAGER;
  const fixedUnit = userRole !== UserRole.GLOBAL_MANAGER && Boolean(currentUser?.scope.unit_id);
  const fixedBranch = Boolean(currentUser?.scope.branch);
  const fixedSection = Boolean(currentUser?.scope.section);
  const units = Array.from(
    new Map(groups.map((group) => [group.unit_id, group.unit])).entries(),
  ).map(([unit_id, unit]) => ({ unit_id, unit }));
  const branches = Array.from(
    new Set(
      groups
        .filter((group) => group.unit_id === value.unit_id)
        .map((group) => group.branch),
    ),
  );
  const sections = Array.from(
    new Set(
      groups
        .filter(
          (group) =>
            group.unit_id === value.unit_id && group.branch === value.branch,
        )
        .map((group) => group.section),
    ),
  );
  const selectableRooms = rooms.filter((room) => {
    const group = groups.find((candidate) => candidate.id === room.group_id);
    return (
      group?.unit_id === value.unit_id &&
      group.branch === value.branch &&
      group.section === value.section &&
      isSelectableRoom(room)
    );
  });

  const roomLabelFor = (room: Room) => {
    const location = locations.find(
      (candidate) => candidate.location_id === room.location,
    );

    return location
      ? `בניין ${location.building}, קומה ${location.floor}, חדר ${location.room_number}`
      : room.room_id;
  };

  return (
    <section className="org-selector" aria-label={title}>
      <h3>{title}</h3>
      {canViewUnit ? (
      <label>
        יחידה
        <select
          disabled={disabled || fixedUnit}
          value={value.unit_id}
          onChange={(event) =>
            onChange({
              unit_id: event.target.value,
              branch: "",
              section: "",
              room_id: "",
            })
          }
        >
          <option value="">בחר/י יחידה</option>
          {units.map((unit) => (
            <option key={unit.unit_id} value={unit.unit_id}>
              {unit.unit}
            </option>
          ))}
        </select>
      </label>
      ) : null}
      <label>
        ענף
        <select
          disabled={disabled || fixedBranch || !value.unit_id}
          value={value.branch}
          onChange={(event) =>
            onChange({
              ...value,
              branch: event.target.value,
              section: "",
              room_id: "",
            })
          }
        >
          <option value="">בחר/י ענף</option>
          {branches.map((branch) => (
            <option key={branch} value={branch}>
              {branch}
            </option>
          ))}
        </select>
      </label>
      <label>
        מדור
        <select
          disabled={disabled || fixedSection || !value.branch}
          value={value.section}
          onChange={(event) =>
            onChange({
              ...value,
              section: event.target.value,
              room_id: "",
            })
          }
        >
          <option value="">בחר/י מדור</option>
          {sections.map((section) => (
            <option key={section} value={section}>
              {section}
            </option>
          ))}
        </select>
      </label>
      <label>
        {roomLabel}
        <select
          disabled={disabled || !value.section}
          value={value.room_id}
          onChange={(event) =>
            onChange({
              ...value,
              room_id: event.target.value,
            })
          }
        >
          <option value="">בחר/י חדר</option>
          {selectableRooms.map((room) => (
            <option key={room.room_id} value={room.room_id}>
              {roomLabelFor(room)}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

