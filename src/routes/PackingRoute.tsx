import { useNavigate } from "@tanstack/react-router";
import { Archive, CheckCircle2, MapPin, PackageCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { BoxType, RoomStatus } from "../../types";
import {
  GhostButton,
  MobileShell,
  PrimaryButton,
  RowButton,
} from "../components/MobileShell";
import { StatusChip } from "../components/StatusChip";
import { useRelocation } from "../state/relocation";

const boxLabels = {
  [BoxType.PERSONAL_BOX]: "קרטון אישי",
  [BoxType.PROF_BOX]: "קרטון מקצועי",
  [BoxType.DOLEV]: "דולב",
  [BoxType.SUITCASE]: "מזוודה",
};

export function PackingRoute() {
  const navigate = useNavigate();
  const { createPacking, groups, locations, rooms } = useRelocation();
  const [step, setStep] = useState(0);
  const [branch, setBranch] = useState("");
  const [section, setSection] = useState("");
  const [roomId, setRoomId] = useState("");
  const [boxType, setBoxType] = useState<BoxType | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [targetBuilding, setTargetBuilding] = useState("");
  const [targetFloor, setTargetFloor] = useState("");
  const [targetRoom, setTargetRoom] = useState("");

  const availableRooms = rooms.filter(
    (room) => room.is_mapped && room.room_status !== RoomStatus.CLOSED_ROOM,
  );
  const branches = Array.from(
    new Set(
      groups
        .filter((group) =>
          availableRooms.some((room) => room.group_id === group.id),
        )
        .map((group) => group.branch),
    ),
  );
  const sections = Array.from(
    new Set(
      groups
        .filter((group) => group.branch === branch)
        .map((group) => group.section),
    ),
  );
  const roomsForSelection = availableRooms.filter((room) => {
    const group = groups.find((candidate) => candidate.id === room.group_id);
    return group?.branch === branch && group.section === section;
  });
  const selectedRoom = rooms.find((room) => room.room_id === roomId);

  const canContinue = useMemo(() => {
    if (step === 0) {
      return Boolean(roomId);
    }

    if (step === 1) {
      return Boolean(boxType);
    }

    if (step === 2) {
      return selectedItemIds.length > 0;
    }

    return Boolean(targetBuilding && targetFloor && targetRoom);
  }, [boxType, roomId, selectedItemIds.length, step, targetBuilding, targetFloor, targetRoom]);

  const toggleItem = (catalogId: string) => {
    setSelectedItemIds((current) =>
      current.includes(catalogId)
        ? current.filter((itemId) => itemId !== catalogId)
        : [...current, catalogId],
    );
  };

  const handleNext = () => {
    if (step < 3) {
      setStep((current) => current + 1);
      return;
    }

    if (roomId && boxType) {
      createPacking(roomId, boxType, selectedItemIds);
      navigate({ to: "/processes" });
    }
  };

  return (
    <MobileShell
      title="יצירת אריזה"
      subtitle={`שלב ${step + 1} מתוך 4`}
      backTo="/processes"
      footer={
        <div className="footer-actions">
          {step > 0 ? (
            <GhostButton onClick={() => setStep((current) => current - 1)}>
              חזרה
            </GhostButton>
          ) : null}
          <PrimaryButton disabled={!canContinue} onClick={handleNext}>
            {step === 3 ? "סגירת אריזה" : "המשך"}
          </PrimaryButton>
        </div>
      }
    >
      <div className="wizard">
        <div className="stepper" aria-label="התקדמות">
          {[0, 1, 2, 3].map((index) => (
            <span
              className={index <= step ? "step-dot active" : "step-dot"}
              key={index}
            />
          ))}
        </div>

        {step === 0 ? (
          <section className="card-soft flow-card">
            <div className="flow-title">
              <MapPin aria-hidden="true" size={20} />
              <h2>בחירת מיקום</h2>
            </div>
            <div className="option-group">
              <h3>ענף</h3>
              {branches.map((candidate) => (
                <RowButton
                  key={candidate}
                  selected={branch === candidate}
                  onClick={() => {
                    setBranch(candidate);
                    setSection("");
                    setRoomId("");
                  }}
                >
                  <span>{candidate}</span>
                </RowButton>
              ))}
            </div>
            {branch ? (
              <div className="option-group">
                <h3>מדור</h3>
                {sections.map((candidate) => (
                  <RowButton
                    key={candidate}
                    selected={section === candidate}
                    onClick={() => {
                      setSection(candidate);
                      setRoomId("");
                    }}
                  >
                    <span>{candidate}</span>
                  </RowButton>
                ))}
              </div>
            ) : null}
            {section ? (
              <div className="option-group">
                <h3>חדר</h3>
                {roomsForSelection.map((room) => {
                  const location = locations.find(
                    (candidate) => candidate.location_id === room.location,
                  );

                  return (
                    <RowButton
                      key={room.room_id}
                      selected={roomId === room.room_id}
                      onClick={() => {
                        setRoomId(room.room_id);
                        setSelectedItemIds([]);
                      }}
                    >
                      <span>
                        בניין {location?.building}, קומה {location?.floor}, חדר{" "}
                        {location?.room_number}
                      </span>
                      <StatusChip status={room.room_status} />
                    </RowButton>
                  );
                })}
              </div>
            ) : null}
          </section>
        ) : null}

        {step === 1 ? (
          <section className="card-soft flow-card">
            <div className="flow-title">
              <Archive aria-hidden="true" size={20} />
              <h2>סוג יחידת אריזה</h2>
            </div>
            <div className="option-group">
              {Object.values(BoxType).map((candidate) => (
                <RowButton
                  key={candidate}
                  selected={boxType === candidate}
                  onClick={() => setBoxType(candidate)}
                >
                  <span>{boxLabels[candidate]}</span>
                </RowButton>
              ))}
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="card-soft flow-card">
            <div className="flow-title">
              <PackageCheck aria-hidden="true" size={20} />
              <h2>פריטים לאריזה</h2>
            </div>
            <div className="option-group">
              {selectedRoom?.items.map((item) => (
                <label className="check-row" key={item.catalog_id}>
                  <input
                    type="checkbox"
                    checked={selectedItemIds.includes(item.catalog_id)}
                    onChange={() => toggleItem(item.catalog_id)}
                  />
                  <span>
                    <strong>{item.description}</strong>
                    <code>{item.catalog_id}</code>
                  </span>
                  <StatusChip status={item.item_status} />
                </label>
              ))}
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="card-soft flow-card">
            <div className="flow-title">
              <CheckCircle2 aria-hidden="true" size={20} />
              <h2>יעד האריזה</h2>
            </div>
            <div className="field-grid">
              <label>
                בניין יעד
                <input
                  inputMode="numeric"
                  value={targetBuilding}
                  onChange={(event) => setTargetBuilding(event.target.value)}
                />
              </label>
              <label>
                קומה
                <input
                  inputMode="numeric"
                  value={targetFloor}
                  onChange={(event) => setTargetFloor(event.target.value)}
                />
              </label>
              <label>
                חדר יעד
                <input
                  inputMode="numeric"
                  value={targetRoom}
                  onChange={(event) => setTargetRoom(event.target.value)}
                />
              </label>
            </div>
          </section>
        ) : null}
      </div>
    </MobileShell>
  );
}

