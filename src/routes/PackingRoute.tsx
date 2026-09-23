import { useNavigate } from "@tanstack/react-router";
import { Archive, ClipboardCheck, MapPin, PackageCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BoxType } from "../../types";
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
import { boxTypeLabels, getRoomLabel } from "../domain/display";
import { searchItemCatalogue } from "../domain/validation";
import { useRelocation } from "../state/relocation";

function sanitizeQuantity(value: string) {
  if (!/^\d*$/.test(value)) {
    return null;
  }

  return value === "" ? 0 : Number(value);
}

export function PackingRoute() {
  const navigate = useNavigate();
  const {
    createPacking,
    error,
    groups,
    itemCatalogue,
    loading,
    locations,
    rooms,
    submitting,
  } = useRelocation();
  const [step, setStep] = useState(0);
  const [source, setSource] = useState<OrgSelection>(() =>
    getInitialOrgSelection(groups),
  );
  const [destination, setDestination] = useState<OrgSelection>(() =>
    getInitialOrgSelection(groups),
  );
  const [boxType, setBoxType] = useState<BoxType | null>(null);
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<number, number>>({});
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
    .map(([catalog_id, quantity]) => ({ catalog_id: Number(catalog_id), quantity }));

  // State arrives after the first render; preselect once it does.
  useEffect(() => {
    const initialSelection = getInitialOrgSelection(groups);
    setSource((current) => (current.unit_id ? current : initialSelection));
    setDestination((current) => (current.unit_id ? current : initialSelection));
  }, [groups]);

  const isPersonalBox = boxType === BoxType.PERSONAL_BOX;

  // Visible step count collapses from 4 to 3 for personal box (items step skipped).
  const totalSteps = isPersonalBox ? 3 : 4;
  // Map internal step index to a 1-based display number, collapsing step 2 out
  // of the count when it will be skipped.
  const displayStep = isPersonalBox && step === 3 ? 3 : step + 1;

  const canContinue =
    step === 0
      ? source.room_id !== null
      : step === 1
        ? Boolean(boxType)
        : step === 2
          ? selectedItems.length > 0
          : destination.room_id !== null;

  const handleBack = () => {
    setValidationMessage("");
    // When on the destination step (3) with personal box, jump back over the
    // skipped items step directly to box-type selection (step 1).
    if (step === 3 && isPersonalBox) {
      setStep(1);
    } else {
      setStep((current) => current - 1);
    }
  };

  const updateQuantity = (catalogId: number, value: string) => {
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

      // The destination room must be in the source room's unit.
      if (step === 2 && destination.unit_id !== source.unit_id) {
        setDestination({ unit_id: source.unit_id, group_id: null, room_id: null });
      }

      // Skip the items step (2) when personal box is selected.
      const nextStep = step === 1 && isPersonalBox ? 3 : step + 1;

      // Sync destination unit when jumping straight from step 1 to step 3.
      if (nextStep === 3 && destination.unit_id !== source.unit_id) {
        setDestination({ unit_id: source.unit_id, group_id: null, room_id: null });
      }

      setStep(nextStep);
      return;
    }

    if (
      !boxType ||
      source.room_id === null ||
      destination.room_id === null
    ) {
      setValidationMessage("יש להשלים מקור וחדר יעד במיקום החדש.");
      return;
    }

    // Personal box ships with no tracked items; all other types require at least one.
    if (!isPersonalBox && selectedItems.length === 0) {
      setValidationMessage("יש לבחור לפחות פריט אחד לאריזה.");
      return;
    }

    const created = await createPacking({
      source_room_id: source.room_id,
      destination_room_id: destination.room_id,
      box_type: boxType,
      items: isPersonalBox ? [] : selectedItems,
    });

    if (created) {
      navigate({ to: "/processes" });
    }
  };

  return (
    <MobileShell
      title="יצירת אריזה"
      subtitle=""
      backTo="/processes"
      footer={
        <div className="footer-actions">
          {step > 0 ? (
            <GhostButton
              disabled={submitting}
              onClick={handleBack}
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
                  <span>{boxTypeLabels[candidate]}</span>
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
                    <code>
                      {item.catalog_id} · {item.category}
                    </code>
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
              unitLocked
              roomLabel="חדר יעד במיקום החדש"
            />
            <div className="route-context card-soft">
              <div>
                <span>חדר מקור</span>
                <strong>{getRoomLabel(locations, sourceRoom)}</strong>
              </div>
              <div>
                <span>חדר יעד במיקום החדש</span>
                <strong>{getRoomLabel(locations, destinationRoom)}</strong>
              </div>
              <div>
                <span>סוג אריזה</span>
                <strong>{boxType ? boxTypeLabels[boxType] : "לא נבחר"}</strong>
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

