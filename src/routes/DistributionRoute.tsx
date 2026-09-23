import { useNavigate } from "@tanstack/react-router";
import { ClipboardCheck, Send } from "lucide-react";
import { useState } from "react";
import { ItemStatus } from "../../types";
import {
  GhostButton,
  MobileShell,
  PrimaryButton,
  RowButton,
} from "../components/MobileShell";
import {
  boxTypeLabels,
  getPackingLabel,
  getRoomLabel,
  getRoomOrgLabel,
} from "../domain/display";
import { getDistributableUnits } from "../domain/flows";
import { useRelocation } from "../state/relocation";
import { useToast } from "../state/toast";

export function DistributionRoute() {
  const navigate = useNavigate();
  const { showSuccessToast } = useToast();
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
  const [unitId, setUnitId] = useState<number | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const receivedUnits = getDistributableUnits(units, rooms);
  const selectedUnit = units.find((unit) => unit.packing_id === unitId);
  const sourceRoom = rooms.find(
    (room) => room.room_id === selectedUnit?.source_room_id,
  );
  const destinationRoom = rooms.find(
    (room) => room.room_id === selectedUnit?.destination_room_id,
  );

  const toggleItem = (itemId: number) => {
    setSelectedItemIds((current) =>
      current.includes(itemId)
        ? current.filter((candidate) => candidate !== itemId)
        : [...current, itemId],
    );
  };

  const handleNext = async () => {
    if (step === 0) {
      setStep(1);
      return;
    }

    if (unitId === null) {
      return;
    }

    const distributed = await distributeUnit(unitId, selectedItemIds);

    if (distributed) {
      navigate({ to: "/processes" });
      showSuccessToast({
        title: "הפיזור אושר בהצלחה",
        message: "הפריטים שנבחרו חולקו מהאריזה.",
        idLabel: "מספר אריזה",
        idValue: unitId,
      });
    }
  };

  return (
    <MobileShell
      title="פיזור ציוד"
      subtitle=""
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
              (step === 0 ? unitId === null : selectedItemIds.length === 0)
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
                    <strong>{getPackingLabel(unit)}</strong>
                    <small>
                      {boxTypeLabels[unit.box_type]} · {unit.items.length} פריטים
                    </small>
                    <small>
                      חדר יעד:{" "}
                      {getRoomLabel(
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
                <strong>{getRoomLabel(locations, sourceRoom)}</strong>
                <small>{getRoomOrgLabel(groups, sourceRoom)}</small>
              </div>
              <div>
                <span>חדר יעד במיקום החדש</span>
                <strong>{getRoomLabel(locations, destinationRoom)}</strong>
                <small>{getRoomOrgLabel(groups, destinationRoom)}</small>
              </div>
            </div>
            <div className="option-group">
              {selectedUnit?.items.map((item) => (
                <label className="check-row" key={item.item_id}>
                  <input
                    type="checkbox"
                    disabled={item.item_status !== ItemStatus.RECEIVED}
                    checked={
                      item.item_status === ItemStatus.DISTRIBUTED ||
                      selectedItemIds.includes(item.item_id)
                    }
                    onChange={() => toggleItem(item.item_id)}
                  />
                  <span>
                    <strong>{item.description}</strong>
                    <code>
                      {item.catalog_id} · כמות {item.quantity}
                      {item.item_status === ItemStatus.DISTRIBUTED ? " · פוזר" : ""}
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
