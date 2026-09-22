import { useNavigate } from "@tanstack/react-router";
import { Archive, ClipboardCheck, MapPin, PackageCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BoxType, type Room } from "../../types";
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
import { searchItemCatalogue } from "../domain/validation";
import { useRelocation } from "../state/relocation";

const boxLabels = {
  [BoxType.PERSONAL_BOX]: "קרטון אישי",
  [BoxType.PROF_BOX]: "קרטון מקצועי",
  [BoxType.DOLEV]: "דולב",
  [BoxType.SUITCASE]: "מזוודה",
};

function sanitizeQuantity(value: string) {
  if (!/^\d*$/.test(value)) {
    return null;
  }

  return value === "" ? 0 : Number(value);
}

function formatRoom(room: Room | undefined, locations: ReturnType<typeof useRelocation>["locations"]) {
  const location = locations.find((candidate) => candidate.location_id === room?.location);

  if (!room || !location) {
    return "לא נבחר";
  }

  return `בניין ${location.building}, קומה ${location.floor}, חדר ${location.room_number}`;
}

export function PackingRoute() {
  const navigate = useNavigate();
  const {
    createPacking,
    currentUser,
    error,
    itemCatalogue,
    loading,
    locations,
    rooms,
    submitting,
  } = useRelocation();
  const [step, setStep] = useState(0);
  const [source, setSource] = useState<OrgSelection>(() =>
    getInitialOrgSelection(currentUser),
  );
  const [destination, setDestination] = useState<OrgSelection>(() =>
    getInitialOrgSelection(currentUser),
  );
  const [boxType, setBoxType] = useState<BoxType | null>(null);
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [validationMessage, setValidationMessage] = useState("");

  const sourceRoom = rooms.find((room) => room.room_id === source.room_id);
  const destinationRoom = rooms.find(
    (room) => room.room_id === destination.room_id,
  );
  const filteredCatalogue = useMemo(
    () => searchItemCatalogue(itemCatalogue, search),
    [itemCatalogue, search],
  );
  const selectedItems = Object.entries(quantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([catalog_id, quantity]) => ({ catalog_id, quantity }));

  useEffect(() => {
    if (currentUser) {
      const initialSelection = getInitialOrgSelection(currentUser);
      setSource(initialSelection);
      setDestination(initialSelection);
    }
  }, [currentUser]);

  const canContinue =
    step === 0
      ? Boolean(source.unit_id && source.branch && source.section && source.room_id)
      : step === 1
        ? Boolean(boxType)
        : step === 2
          ? selectedItems.length > 0
          : Boolean(
              destination.unit_id &&
                destination.branch &&
                destination.section &&
                destination.room_id,
            );

  const updateQuantity = (catalogId: string, value: string) => {
    const quantity = sanitizeQuantity(value);

    if (quantity === null) {
      setValidationMessage("כמות חייבת להיות מספר שלם לא שלילי.");
      return;
    }

    setValidationMessage("");
    setQuantities((current) => ({
      ...current,
      [catalogId]: quantity,
    }));
  };

  const handleNext = async () => {
    if (!canContinue) {
      setValidationMessage(
        step === 3
          ? "חדר יעד במיקום החדש הוא שדה חובה."
          : "יש להשלים את השלב לפני המשך.",
      );
      return;
    }

    if (step < 3) {
      setValidationMessage("");
      setStep((current) => current + 1);
      return;
    }

    if (!boxType || selectedItems.length === 0 || !destination.room_id) {
      setValidationMessage("יש להשלים מקור, פריטים וחדר יעד במיקום החדש.");
      return;
    }

    const created = await createPacking({
      unit_id: source.unit_id,
      source_room_id: source.room_id,
      destination_room_id: destination.room_id,
      box_type: boxType,
      items: selectedItems,
    });

    if (created) {
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
            <GhostButton
              disabled={submitting}
              onClick={() => {
                setValidationMessage("");
                setStep((current) => current - 1);
              }}
            >
              חזרה
            </GhostButton>
          ) : null}
          <PrimaryButton disabled={!canContinue || submitting} onClick={handleNext}>
            {submitting ? "שומר..." : step === 3 ? "יצירת אריזה" : "המשך"}
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
              <h2>חדר מקור</h2>
            </div>
            <OrgSelector
              title="חדר מקור"
              value={source}
              onChange={(nextSource) => {
                setSource(nextSource);
                setQuantities({});
              }}
              disabled={submitting}
              roomLabel="חדר מקור"
            />
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
            <label className="select-label">
              חיפוש לפי שם או מק״ט
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="חיפוש פריט"
              />
            </label>
            <div className="catalogue-list">
              {filteredCatalogue.length === 0 ? (
                <p className="empty-state">לא נמצאו פריטים.</p>
              ) : null}
              {filteredCatalogue.map((item) => (
                <label className="catalogue-row" key={item.catalog_id}>
                  <span>
                    <strong>{item.description}</strong>
                    <code>{item.catalog_id}</code>
                  </span>
                  <input
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={quantities[item.catalog_id] ?? 0}
                    onChange={(event) =>
                      updateQuantity(item.catalog_id, event.target.value)
                    }
                    aria-label={`כמות עבור ${item.description}`}
                  />
                </label>
              ))}
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="card-soft flow-card">
            <div className="flow-title">
              <ClipboardCheck aria-hidden="true" size={20} />
              <h2>יעד וסיכום</h2>
            </div>
            <OrgSelector
              title="חדר יעד במיקום החדש"
              value={destination}
              onChange={setDestination}
              disabled={submitting}
              roomLabel="חדר יעד במיקום החדש"
            />
            <div className="route-context card-soft">
              <div>
                <span>חדר מקור</span>
                <strong>{formatRoom(sourceRoom, locations)}</strong>
              </div>
              <div>
                <span>חדר יעד במיקום החדש</span>
                <strong>{formatRoom(destinationRoom, locations)}</strong>
              </div>
              <div>
                <span>סוג אריזה</span>
                <strong>{boxType ? boxLabels[boxType] : "לא נבחר"}</strong>
              </div>
              <div>
                <span>פריטים שנבחרו</span>
                <strong>{selectedItems.length}</strong>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </MobileShell>
  );
}

