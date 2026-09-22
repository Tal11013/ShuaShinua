import { useNavigate } from "@tanstack/react-router";
import { ClipboardCheck, Inbox } from "lucide-react";
import { useState } from "react";
import { MovingUnitStatus, PackingUnitStatus } from "../../types";
import {
  GhostButton,
  MobileShell,
  PrimaryButton,
  RowButton,
} from "../components/MobileShell";
import { StatusChip } from "../components/StatusChip";
import { useRelocation } from "../state/relocation";

export function ReceivingRoute() {
  const navigate = useNavigate();
  const { receiveTransport, transports, units } = useRelocation();
  const [step, setStep] = useState(0);
  const [transportId, setTransportId] = useState("");
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const activeTransports = transports.filter(
    (transport) => transport.moving_status === MovingUnitStatus.ON_WAY,
  );
  const inTransitUnits = units.filter(
    (unit) => unit.packing_status === PackingUnitStatus.PACKING_ON_WAY,
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

    receiveTransport(transportId, selectedUnitIds);
    navigate({ to: "/processes" });
  };

  return (
    <MobileShell
      title="קבלת ציוד"
      subtitle={`שלב ${step + 1} מתוך 2`}
      backTo="/processes"
      footer={
        <div className="footer-actions">
          {step > 0 ? (
            <GhostButton onClick={() => setStep(0)}>חזרה</GhostButton>
          ) : null}
          <PrimaryButton
            disabled={step === 0 ? !transportId : selectedUnitIds.length === 0}
            onClick={handleNext}
          >
            {step === 0 ? "המשך" : "אישור קבלה"}
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
              <Inbox aria-hidden="true" size={20} />
              <h2>בחירת הובלה</h2>
            </div>
            <div className="option-group">
              {activeTransports.map((transport) => (
                <RowButton
                  key={transport.moving_id}
                  selected={transportId === transport.moving_id}
                  onClick={() => setTransportId(transport.moving_id)}
                >
                  <span>
                    <strong>{transport.moving_id}</strong>
                    <small>
                      {transport.moving_type} ·{" "}
                      {transport.moving_date.toLocaleTimeString("he-IL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </span>
                  <StatusChip status={transport.moving_status} />
                </RowButton>
              ))}
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="card-soft flow-card">
            <div className="flow-title">
              <ClipboardCheck aria-hidden="true" size={20} />
              <h2>אישור אריזות</h2>
            </div>
            <div className="option-group">
              {inTransitUnits.map((unit) => (
                <label className="check-row" key={unit.packing_id}>
                  <input
                    type="checkbox"
                    checked={selectedUnitIds.includes(unit.packing_id)}
                    onChange={() => toggleUnit(unit.packing_id)}
                  />
                  <span>
                    <strong>{unit.packing_id}</strong>
                    <small>{unit.items.length} פריטים</small>
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

