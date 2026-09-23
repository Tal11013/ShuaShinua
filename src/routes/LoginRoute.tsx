import { LogIn } from "lucide-react";
import { useState } from "react";
import { PrimaryButton } from "../components/MobileShell";
import {
  IDENTITY_NUMBER_MESSAGE,
  IDENTITY_NUMBER_REGEX,
} from "../domain/validation";
import { useRelocation } from "../state/relocation";

export function LoginRoute() {
  const { error, login, submitting } = useRelocation();
  const [identityNum, setIdentityNum] = useState("");
  const [validationMessage, setValidationMessage] = useState("");

  const isValid = IDENTITY_NUMBER_REGEX.test(identityNum);

  const submit = async () => {
    if (!isValid) {
      setValidationMessage(IDENTITY_NUMBER_MESSAGE);
      return;
    }

    setValidationMessage("");
    await login(identityNum);
  };

  return (
    <main className="login-shell" dir="rtl">
      <section className="login-card card-soft">
        <span className="login-icon">
          <LogIn aria-hidden="true" size={28} />
        </span>
        <div>
          <p className="eyebrow">כניסה למערכת</p>
          <h1>פינוי ציוד</h1>
          <p>הזדהות לפי מספר זהות</p>
        </div>
        <label className="select-label">
          מספר זהות
          <input
            inputMode="numeric"
            maxLength={9}
            value={identityNum}
            onChange={(event) => {
              const nextValue = event.target.value;

              if (/^\d*$/.test(nextValue)) {
                setIdentityNum(nextValue);
                setValidationMessage(
                  nextValue.length > 0 && !IDENTITY_NUMBER_REGEX.test(nextValue)
                    ? IDENTITY_NUMBER_MESSAGE
                    : "",
                );
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void submit();
              }
            }}
            placeholder="300000022"
          />
        </label>
        {validationMessage ? (
          <p className="state-message error">{validationMessage}</p>
        ) : null}
        {error ? <p className="state-message error">{error}</p> : null}
        <PrimaryButton disabled={!isValid || submitting} onClick={submit}>
          {submitting ? "מתחבר..." : "כניסה"}
        </PrimaryButton>
        <div className="login-hints" aria-label="משתמשים לדוגמה">
          <span>300000022 · עובד</span>
          <span>300000011 · מנהל יחידה</span>
          <span>300000033 · מנהל גלובלי</span>
        </div>
      </section>
    </main>
  );
}
