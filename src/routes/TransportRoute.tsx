import { useNavigate } from "@tanstack/react-router";
import { ClipboardList, Truck } from "lucide-react";
import { useState } from "react";
import { MovingType } from "../../types";
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
  movingTypeLabels,
} from "../domain/display";
import { getTransportableUnits } from "../domain/flows";
import {
  VEHICLE_NUMBER_MESSAGE,
  validateVehicleDetails,
  validateVehicleNumber,
} from "../domain/validation";
import { useRelocation } from "../state/relocation";
import { PackingNumberScanner } from "../components/PackingNumberScanner";

export function TransportRoute() {
  const navigate = useNavigate();
  const { createTransport, error, loading, locations, rooms, submitting, units } =
    useRelocation();
  const [step, setStep] = useState(0);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleDetails, setVehicleDetails] = useState("");
  const [movingType, setMovingType] = useState(MovingType.TRACK);
  const [selectedUnitIds, setSelectedUnitIds] = useState<number[]>([]);
  const [packingSearch, setPackingSearch] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const sealedUnits = getTransportableUnits(units, rooms);
  const filteredUnits = sealedUnits.filter((unit) =>
    String(unit.packing_id).includes(packingSearch.trim()),
  );
  const isOtherVehicle = movingType === MovingType.CAR;
  const isVehicleValid = isOtherVehicle
    ? validateVehicleDetails(vehicleDetails)
    : validateVehicleNumber(vehicleNumber);

  const toggleUnit = (unitId: number) => {
    setSelectedUnitIds((current) =>
      current.includes(unitId)
        ? current.filter((candidate) => candidate !== unitId)
        : [...current, unitId],
    );
  };

  const selectScannedUnit = (unitId: number) => {
    setPackingSearch(String(unitId));
    setSelectedUnitIds((current) =>
      current.includes(unitId) ? current : [...current, unitId],
    );
  };

  const selectMovingType = (nextType: MovingType) => {
    setMovingType(nextType);
    setVehicleNumber("");
    setVehicleDetails("");
    setValidationMessage("");
  };

  const handleNext = async () => {
    if (step === 0) {
      if (!isVehicleValid) {
        setValidationMessage(isOtherVehicle ? "יש להזין פירוט." : VEHICLE_NUMBER_MESSAGE);
        return;
      }

      setValidationMessage("");
      setStep(1);
      return;
    }

    const created = await createTransport({
      moving_type: movingType,
      ...(isOtherVehicle
        ? { vehicle_details: vehicleDetails }
        : { vehicle_number: vehicleNumber }),
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
              (step === 0 ? !isVehicleValid : selectedUnitIds.length === 0)
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
            <div className="option-group">
              <h3>סוג רכב</h3>
              {Object.values(MovingType).map((candidate) => (
                <RowButton
                  key={candidate}
                  selected={movingType === candidate}
                  onClick={() => selectMovingType(candidate)}
                >
                  <span>{movingTypeLabels[candidate]}</span>
                </RowButton>
              ))}
            </div>
            <div className="field-grid">
              {isOtherVehicle ? (
                <label>
                  פירוט
                  <input
                    value={vehicleDetails}
                    onChange={(event) => {
                      setVehicleDetails(event.target.value);
                      setValidationMessage("");
                    }}
                    placeholder="אמצעי זיהוי"
                  />
                </label>
              ) : (
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
              )}
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="card-soft flow-card">
            <div className="flow-title">
              <ClipboardList aria-hidden="true" size={20} />
              <h2>טעינת אריזות</h2>
            </div>
            <div className="packing-search-row">
              <label className="select-label">
                חיפוש לפי מספר אריזה
                <input
                  inputMode="numeric"
                  value={packingSearch}
                  onChange={(event) =>
                    setPackingSearch(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="לדוגמה: 123"
                />
              </label>
              <PackingNumberScanner
                availablePackingIds={sealedUnits.map((unit) => unit.packing_id)}
                onDetected={selectScannedUnit}
              />
            </div>
            <div className="option-group">
              {sealedUnits.length === 0 ? (
                <p className="empty-state">אין אריזות סגורות זמינות.</p>
              ) : null}
              {sealedUnits.length > 0 && filteredUnits.length === 0 ? (
                <p className="empty-state">לא נמצאו אריזות התואמות לחיפוש.</p>
              ) : null}
              {filteredUnits.map((unit) => (
                <label className="check-row" key={unit.packing_id}>
                  <input
                    type="checkbox"
                    checked={selectedUnitIds.includes(unit.packing_id)}
                    onChange={() => toggleUnit(unit.packing_id)}
                  />
                  <span>
                    <strong>{getPackingLabel(unit)}</strong>
                    <small>
                      {boxTypeLabels[unit.box_type]} · {unit.items.length} פריטים
                    </small>
                    <small>
                      מ: {getRoomLabel(locations, rooms.find((room) => room.room_id === unit.source_room_id))}
                    </small>
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
