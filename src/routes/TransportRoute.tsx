import { useNavigate } from "@tanstack/react-router";
import { ClipboardList, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { MovingType, PackingUnitStatus } from "../../types";
import {
  GhostButton,
  MobileShell,
  PrimaryButton,
  RowButton,
} from "../components/MobileShell";
import {
  OrgSelector,
  getInitialOrgSelection,
  type OrgSelection,
} from "../components/OrgSelector";
import { StatusChip } from "../components/StatusChip";
import { VEHICLE_NUMBER_MESSAGE, validateVehicleNumber } from "../domain/validation";
import { useRelocation } from "../state/relocation";

const movingTypeLabels = {
  [MovingType.TRACK]: "משאית",
  [MovingType.CAR]: "אחר",
};

export function TransportRoute() {
  const navigate = useNavigate();
  const {
    createTransport,
    currentUser,
    error,
    loading,
    submitting,
    units,
  } = useRelocation();
  const [step, setStep] = useState(0);
  const [scope, setScope] = useState<OrgSelection>(() =>
    getInitialOrgSelection(currentUser),
  );
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [movingType, setMovingType] = useState(MovingType.TRACK);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [validationMessage, setValidationMessage] = useState("");
  const sealedUnits = units.filter(
    (unit) =>
      unit.packing_status === PackingUnitStatus.PACKING_CLOSED &&
      unit.source_room_id === scope.room_id,
  );
  const isVehicleValid = validateVehicleNumber(vehicleNumber);

  useEffect(() => {
    if (currentUser) {
      setScope(getInitialOrgSelection(currentUser));
    }
  }, [currentUser]);

  const toggleUnit = (unitId: string) => {
    setSelectedUnitIds((current) =>
      current.includes(unitId)
        ? current.filter((candidate) => candidate !== unitId)
        : [...current, unitId],
    );
  };

  const handleNext = async () => {
    if (step === 0) {
      if (!isVehicleValid) {
        setValidationMessage(VEHICLE_NUMBER_MESSAGE);
        return;
      }

      setValidationMessage("");
      setStep(1);
      return;
    }

    const created = await createTransport({
      unit_id: scope.unit_id,
      moving_type: movingType,
      vehicle_number: vehicleNumber,
      packing_ids: selectedUnitIds,
    });

    if (created) {
      navigate({ to: "/processes" });
    }
  };

  return (
    <MobileShell
      title="יצירת הובלה"
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
              (step === 0
                ? !scope.room_id || !vehicleNumber || !isVehicleValid
                : selectedUnitIds.length === 0)
            }
            onClick={handleNext}
          >
            {submitting ? "שומר..." : step === 0 ? "המשך" : "שיגור הובלה"}
          </PrimaryButton>
        </div>
      }
    >
      {loading ? <p className="state-message">טוען נתונים...</p> : null}
      {error ? <p className="state-message error">{error}</p> : null}
      {validationMessage ? (
        <p className="state-message error">{validationMessage}</p>
      ) : null}

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
              <h2>פרטי הובלה</h2>
            </div>
            <OrgSelector
              title="תחום פעולה"
              value={scope}
              onChange={(nextScope) => {
                setScope(nextScope);
                setSelectedUnitIds([]);
              }}
              disabled={submitting}
              roomLabel="חדר מקור"
            />
            <div className="field-grid">
              <label>
                מספר רכב
                <input
                  inputMode="numeric"
                  value={vehicleNumber}
                  onChange={(event) => {
                    const nextValue = event.target.value;

                    setVehicleNumber(nextValue);
                    setValidationMessage(
                      nextValue && !validateVehicleNumber(nextValue)
                        ? VEHICLE_NUMBER_MESSAGE
                        : "",
                    );
                  }}
                  placeholder="12345678"
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
                <p className="empty-state">אין אריזות סגורות בתחום שנבחר.</p>
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

