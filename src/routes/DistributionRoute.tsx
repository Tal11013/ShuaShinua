import { useNavigate } from "@tanstack/react-router";
import { ClipboardCheck, Send } from "lucide-react";
import { useState } from "react";
import { PackingUnitStatus } from "../../types";
import {
  GhostButton,
  MobileShell,
  PrimaryButton,
  RowButton,
} from "../components/MobileShell";
import { getLocationLabel, getRoomOrgLabel } from "../domain/display";
import { useRelocation } from "../state/relocation";

export function DistributionRoute() {
  const navigate = useNavigate();
  const {
    distributeUnit,
    error,
    groups,
    loading,
    locations,
    rooms,
    submitting,
    units,
  } = useRelocation();
  const [step, setStep] = useState(0);
  const [unitId, setUnitId] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const receivedUnits = units.filter(
    (unit) => unit.packing_status === PackingUnitStatus.PACKING_RECEIVED,
  );
  const selectedUnit = units.find((unit) => unit.packing_id === unitId);
  const sourceRoom = rooms.find(
    (room) => room.room_id === selectedUnit?.source_room_id,
  );
  const destinationRoom = rooms.find(
    (room) => room.room_id === selectedUnit?.destination_room_id,
  );

  const toggleItem = (catalogId: string) => {
    setSelectedItemIds((current) =>
      current.includes(catalogId)
        ? current.filter((candidate) => candidate !== catalogId)
        : [...current, catalogId],
    );
  };

  const handleNext = async () => {
    if (step === 0) {
      setStep(1);
      return;
    }

    const distributed = await distributeUnit(unitId, selectedItemIds);

    if (distributed) {
      navigate({ to: "/processes" });
    }
  };

  return (
    <MobileShell
      title="פיזור ציוד"
      subtitle={`שלב ${step + 1} מתוך 2`}
      backTo="/processes"
      footer={
        <div className="footer-actions">
          {step > 0 ? (
            <GhostButton disabled={submitting} onClick={() => setStep(0)}>
              חזרה
            </GhostButton>
          ) : null}
          <PrimaryButton
            disabled={
              submitting ||
              (step === 0 ? !unitId : selectedItemIds.length === 0)
            }
            onClick={handleNext}
          >
            {submitting ? "שומר..." : step === 0 ? "המשך" : "אישור פיזור"}
          </PrimaryButton>
        </div>
      }
    >
      {loading ? <p className="state-message">טוען נתונים...</p> : null}
      {error ? <p className="state-message error">{error}</p> : null}

      <div className="wizard">
        <div className="stepper" aria-label="התקדמות">
          {[0, 1].map((index) => (
            <span
              className={index <= step ? "step-dot active" : "step-dot"}
              key={index}
            />
          ))}
        </div>

        {step === 0 ? (
          <section className="card-soft flow-card">
            <div className="flow-title">
              <Send aria-hidden="true" size={20} />
              <h2>בחירת אריזה</h2>
            </div>
            <div className="option-group">
              {receivedUnits.length === 0 ? (
                <p className="empty-state">אין אריזות שהתקבלו לפיזור.</p>
              ) : null}
              {receivedUnits.map((unit) => (
                <RowButton
                  key={unit.packing_id}
                  selected={unitId === unit.packing_id}
                  onClick={() => {
                    setUnitId(unit.packing_id);
                    setSelectedItemIds([]);
                  }}
                >
                  <span>
                    <strong>{unit.packing_id}</strong>
                    <small>
                      {unit.box_type} · {unit.items.length} פריטים
                    </small>
                    <small>
                      חדר יעד:{" "}
                      {getLocationLabel(
                        locations,
                        rooms.find(
                          (room) => room.room_id === unit.destination_room_id,
                        ),
                      )}
                    </small>
                  </span>
                </RowButton>
              ))}
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="card-soft flow-card">
            <div className="flow-title">
              <ClipboardCheck aria-hidden="true" size={20} />
              <h2>אישור פריטים</h2>
            </div>
            <div className="route-context card-soft">
              <div>
                <span>חדר מקור</span>
                <strong>{getLocationLabel(locations, sourceRoom)}</strong>
                <small>{getRoomOrgLabel(groups, sourceRoom)}</small>
              </div>
              <div>
                <span>חדר יעד במיקום החדש</span>
                <strong>{getLocationLabel(locations, destinationRoom)}</strong>
                <small>{getRoomOrgLabel(groups, destinationRoom)}</small>
              </div>
            </div>
            <div className="option-group">
              {selectedUnit?.items.map((item) => (
                <label className="check-row" key={item.catalog_id}>
                  <input
                    type="checkbox"
                    checked={selectedItemIds.includes(item.catalog_id)}
                    onChange={() => toggleItem(item.catalog_id)}
                  />
                  <span>
                    <strong>{item.description}</strong>
                    <code>
                      {item.catalog_id}
                      {item.quantity ? ` · ${item.quantity}` : ""}
                    </code>
                  </span>
                </label>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </MobileShell>
  );
}
