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
import { useRelocation } from "../state/relocation";

export function ReceivingRoute() {
  const navigate = useNavigate();
  const {
    error,
    loading,
    receiveTransport,
    submitting,
    transports,
    units,
  } = useRelocation();
  const [step, setStep] = useState(0);
  const [transportId, setTransportId] = useState("");
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const activeTransports = transports.filter(
    (transport) =>
      transport.moving_status === MovingUnitStatus.ON_WAY &&
      units.some(
        (unit) =>
          unit.transport_id === transport.moving_id &&
          unit.packing_status === PackingUnitStatus.PACKING_ON_WAY,
      ),
  );
  const selectedTransport = transports.find(
    (transport) => transport.moving_id === transportId,
  );
  const inTransitUnits = units.filter(
    (unit) =>
      unit.packing_status === PackingUnitStatus.PACKING_ON_WAY &&
      unit.transport_id === transportId,
  );
  const getVehicleDescription = (transport: typeof transports[number]) =>
    transport.vehicle_details
      ? `פירוט: ${transport.vehicle_details}`
      : `מספר רכב: ${transport.vehicle_number ?? "לא קיים במערכת"}`;

  const toggleUnit = (unitId: string) => {
    setSelectedUnitIds((current) =>
      current.includes(unitId)
        ? current.filter((candidate) => candidate !== unitId)
        : [...current, unitId],
    );
  };

  const handleNext = async () => {
    if (step === 0) {
      setStep(1);
      return;
    }

    const received = await receiveTransport(transportId, selectedUnitIds);

    if (received) {
      navigate({ to: "/processes" });
    }
  };

  return (
    <MobileShell
      title="קבלת ציוד"
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
              (step === 0 ? !transportId : selectedUnitIds.length === 0)
            }
            onClick={handleNext}
          >
            {submitting ? "שומר..." : step === 0 ? "המשך" : "אישור קבלה"}
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
              <Inbox aria-hidden="true" size={20} />
              <h2>בחירת הובלה</h2>
            </div>
            <div className="option-group">
              {activeTransports.length === 0 ? (
                <p className="empty-state">אין הובלות פעילות לקבלה.</p>
              ) : null}
              {activeTransports.map((transport) => (
                <RowButton
                  key={transport.moving_id}
                  selected={transportId === transport.moving_id}
                  onClick={() => {
                    setTransportId(transport.moving_id);
                    setSelectedUnitIds([]);
                  }}
                >
                  <span>
                    <strong>{transport.moving_type}</strong>
                    <small>{getVehicleDescription(transport)}</small>
                    <code>{transport.moving_id}</code>
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
              <h2>אישור אריזות</h2>
            </div>
            {selectedTransport ? (
              <p className="context-note">
                {selectedTransport.moving_type}
                <br />
                {getVehicleDescription(selectedTransport)}
              </p>
            ) : null}
            <div className="option-group">
              {inTransitUnits.length === 0 ? (
                <p className="empty-state">אין אריזות משויכות להובלה זו.</p>
              ) : null}
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
                </label>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </MobileShell>
  );
}
