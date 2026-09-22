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
import { StatusChip } from "../components/StatusChip";
import { useRelocation } from "../state/relocation";

export function DistributionRoute() {
  const navigate = useNavigate();
  const { distributeUnit, units } = useRelocation();
  const [step, setStep] = useState(0);
  const [unitId, setUnitId] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const receivedUnits = units.filter(
    (unit) => unit.packing_status === PackingUnitStatus.PACKING_RECEIVED,
  );
  const selectedUnit = units.find((unit) => unit.packing_id === unitId);

  const toggleItem = (catalogId: string) => {
    setSelectedItemIds((current) =>
      current.includes(catalogId)
        ? current.filter((candidate) => candidate !== catalogId)
        : [...current, catalogId],
    );
  };

  const handleNext = () => {
    if (step === 0) {
      setStep(1);
      return;
    }

    distributeUnit(unitId, selectedItemIds);
    navigate({ to: "/processes" });
  };

  return (
    <MobileShell
      title="פיזור ציוד"
      subtitle={`שלב ${step + 1} מתוך 2`}
      backTo="/processes"
      footer={
        <div className="footer-actions">
          {step > 0 ? (
            <GhostButton onClick={() => setStep(0)}>חזרה</GhostButton>
          ) : null}
          <PrimaryButton
            disabled={step === 0 ? !unitId : selectedItemIds.length === 0}
            onClick={handleNext}
          >
            {step === 0 ? "המשך" : "אישור פיזור"}
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
              <Send aria-hidden="true" size={20} />
              <h2>בחירת אריזה</h2>
            </div>
            <div className="option-group">
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
                  </span>
                  <StatusChip status={unit.packing_status} />
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
                    <code>{item.catalog_id}</code>
                  </span>
                  <StatusChip status={item.item_status} />
                </label>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </MobileShell>
  );
}

