import { useNavigate } from "@tanstack/react-router";
import { ClipboardList, Truck } from "lucide-react";
import { useState } from "react";
import { MovingType, PackingUnitStatus } from "../../types";
import {
  GhostButton,
  MobileShell,
  PrimaryButton,
  RowButton,
} from "../components/MobileShell";
import { StatusChip } from "../components/StatusChip";
import { useRelocation } from "../state/relocation";

const movingTypeLabels = {
  [MovingType.TRACK]: "משאית",
  [MovingType.CAR]: "אחר",
};

export function TransportRoute() {
  const navigate = useNavigate();
  const { createTransport, units } = useRelocation();
  const [step, setStep] = useState(0);
  const [plate, setPlate] = useState("");
  const [movingType, setMovingType] = useState(MovingType.TRACK);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const sealedUnits = units.filter(
    (unit) => unit.packing_status === PackingUnitStatus.PACKING_CLOSED,
  );

  const toggleUnit = (unitId: string) => {
    setSelectedUnitIds((current) =>
      current.includes(unitId)
        ? current.filter((candidate) => candidate !== unitId)
        : [...current, unitId],
    );
  };

  const handleNext = () => {
    if (step === 0) {
      setStep(1);
      return;
    }

    createTransport(movingType, selectedUnitIds);
    navigate({ to: "/processes" });
  };

  return (
    <MobileShell
      title="יצירת הובלה"
      subtitle={`שלב ${step + 1} מתוך 2`}
      backTo="/processes"
      footer={
        <div className="footer-actions">
          {step > 0 ? (
            <GhostButton onClick={() => setStep(0)}>חזרה</GhostButton>
          ) : null}
          <PrimaryButton
            disabled={step === 0 ? !plate : selectedUnitIds.length === 0}
            onClick={handleNext}
          >
            {step === 0 ? "המשך" : "שיגור הובלה"}
          </PrimaryButton>
        </div>
      }
    >
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
              <Truck aria-hidden="true" size={20} />
              <h2>פרטי רכב</h2>
            </div>
            <div className="field-grid">
              <label>
                מספר רכב
                <input
                  value={plate}
                  onChange={(event) => setPlate(event.target.value)}
                  placeholder="לדוגמה 123-45-678"
                />
              </label>
            </div>
            <div className="option-group">
              <h3>סוג רכב</h3>
              {Object.values(MovingType).map((candidate) => (
                <RowButton
                  key={candidate}
                  selected={movingType === candidate}
                  onClick={() => setMovingType(candidate)}
                >
                  <span>{movingTypeLabels[candidate]}</span>
                </RowButton>
              ))}
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="card-soft flow-card">
            <div className="flow-title">
              <ClipboardList aria-hidden="true" size={20} />
              <h2>טעינת אריזות</h2>
            </div>
            <div className="option-group">
              {sealedUnits.length === 0 ? (
                <p className="empty-state">אין אריזות סגורות לטעינה.</p>
              ) : null}
              {sealedUnits.map((unit) => (
                <label className="check-row" key={unit.packing_id}>
                  <input
                    type="checkbox"
                    checked={selectedUnitIds.includes(unit.packing_id)}
                    onChange={() => toggleUnit(unit.packing_id)}
                  />
                  <span>
                    <strong>{unit.packing_id}</strong>
                    <small>{unit.box_type}</small>
                  </span>
                  <StatusChip status={unit.packing_status} />
                </label>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </MobileShell>
  );
}

