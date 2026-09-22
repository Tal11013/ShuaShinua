import { useNavigate } from "@tanstack/react-router";
import { ClipboardCheck, Inbox } from "lucide-react";
import { useEffect, useState } from "react";
import { MovingUnitStatus, PackingUnitStatus } from "../../types";
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
import { useRelocation } from "../state/relocation";

export function ReceivingRoute() {
  const navigate = useNavigate();
  const {
    error,
    currentUser,
    loading,
    receiveTransport,
    submitting,
    transports,
    units,
  } = useRelocation();
  const [step, setStep] = useState(0);
  const [scope, setScope] = useState<OrgSelection>(() =>
    getInitialOrgSelection(currentUser),
  );
  const [transportId, setTransportId] = useState("");
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const activeTransports = transports.filter(
    (transport) =>
      transport.moving_status === MovingUnitStatus.ON_WAY &&
      units.some(
        (unit) =>
          unit.transport_id === transport.moving_id &&
          unit.source_room_id === scope.room_id,
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

  const toggleUnit = (unitId: string) => {
    setSelectedUnitIds((current) =>
      current.includes(unitId)
        ? current.filter((candidate) => candidate !== unitId)
        : [...current, unitId],
    );
  };

  useEffect(() => {
    if (currentUser) {
      setScope(getInitialOrgSelection(currentUser));
    }
  }, [currentUser]);

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
              (step === 0 ? !scope.room_id || !transportId : selectedUnitIds.length === 0)
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
            <OrgSelector
              title="תחום פעולה"
              value={scope}
              onChange={(nextScope) => {
                setScope(nextScope);
                setTransportId("");
                setSelectedUnitIds([]);
              }}
              disabled={submitting}
              roomLabel="חדר מקור"
            />
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
                    <small>
                      מספר רכב: {transport.vehicle_number ?? "לא קיים במערכת"}
                    </small>
                    <code>{transport.moving_id}</code>
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
            {selectedTransport ? (
              <p className="context-note">
                {selectedTransport.moving_type}
                <br />
                מספר רכב: {selectedTransport.vehicle_number ?? "לא קיים במערכת"}
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
