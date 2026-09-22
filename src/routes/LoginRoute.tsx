import { LogIn } from "lucide-react";
import { useState } from "react";
import { PrimaryButton } from "../components/MobileShell";
import { useRelocation } from "../state/relocation";

const PERSONAL_NUMBER_MESSAGE = "מספר אישי חייב להכיל 7 ספרות.";

export function LoginRoute() {
  const { error, login, submitting } = useRelocation();
  const [personalNumber, setPersonalNumber] = useState("");
  const [validationMessage, setValidationMessage] = useState("");

  const isValid = /^\d{7}$/.test(personalNumber);

  const submit = async () => {
    if (!isValid) {
      setValidationMessage(PERSONAL_NUMBER_MESSAGE);
      return;
    }

    setValidationMessage("");
    await login(personalNumber);
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
          <p>הזדהות לפי מספר אישי בן 7 ספרות.</p>
        </div>
        <label className="select-label">
          מספר אישי
          <input
            inputMode="numeric"
            maxLength={7}
            value={personalNumber}
            onChange={(event) => {
              const nextValue = event.target.value;

              if (/^\d*$/.test(nextValue)) {
                setPersonalNumber(nextValue);
                setValidationMessage(
                  nextValue.length > 0 && !/^\d{7}$/.test(nextValue)
                    ? PERSONAL_NUMBER_MESSAGE
                    : "",
                );
              }
            }}
            placeholder="1111111"
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
          <span>1111111 · עובד</span>
          <span>2222222 · מנהל יחידה</span>
          <span>3333333 · מנהל גלובלי</span>
        </div>
      </section>
    </main>
  );
}

