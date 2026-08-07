"use client";

import { useState } from "react";
import { createSession, getWeatherSuggestion } from "@/app/dashboard/actions";
import { cardClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/dark-ui";

type AutofillStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "done"; message: string };

const SESSION_TYPES = [
  { value: "race_meeting", label: "Race", Icon: FlagIcon },
  { value: "practice", label: "Practice", Icon: StopwatchIcon },
  { value: "test_day", label: "Test", Icon: WrenchIcon },
  { value: "other", label: "Other", Icon: DotsIcon },
];

function FlagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M5 3v18" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </svg>
  );
}

function StopwatchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13l3-3M9 2h6" />
    </svg>
  );
}

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2-2 2.5-2.5z" />
    </svg>
  );
}

function DotsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

export default function NewSessionForm() {
  const [trackName, setTrackName] = useState("");
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dayType, setDayType] = useState("test_day");
  const [temperature, setTemperature] = useState("");
  const [windy, setWindy] = useState("");
  const [skyConditions, setSkyConditions] = useState("");
  const [autofill, setAutofill] = useState<AutofillStatus>({ state: "idle" });

  async function handleAutofill() {
    setAutofill({ state: "loading" });
    const result = await getWeatherSuggestion(trackName, sessionDate);
    if ("error" in result) {
      setAutofill({ state: "error", message: result.error });
      return;
    }
    setTemperature(result.temperature);
    setWindy(result.windy ? "yes" : "no");
    setSkyConditions(result.skyConditions);
    setAutofill({ state: "done", message: `Filled from ${result.locationLabel}` });
  }

  return (
    <form action={createSession} className="flex flex-col gap-6">
      <div className={cardClass}>
        <h2 className="mb-4 text-sm font-medium text-neutral-400">Day info</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="trackName" className={labelClass}>
              Track
            </label>
            <input
              id="trackName"
              name="trackName"
              type="text"
              required
              placeholder="e.g. PFI Kart Track"
              value={trackName}
              onChange={(e) => setTrackName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Session type</label>
            <input type="hidden" name="dayType" value={dayType} />
            <div className="grid grid-cols-4 gap-2">
              {SESSION_TYPES.map(({ value, label, Icon }) => {
                const active = dayType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDayType(value)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium transition-colors ${
                      active
                        ? "border-red-600 bg-red-600/10 text-red-400"
                        : "border-neutral-700 bg-neutral-800/80 text-neutral-400 hover:border-neutral-600"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sessionDate" className={labelClass}>
                Date
              </label>
              <input
                id="sessionDate"
                name="sessionDate"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className={`${inputClass} [color-scheme:dark]`}
              />
            </div>
            <div>
              <label htmlFor="sessionTime" className={labelClass}>
                Start time <span className="font-normal text-neutral-500">(optional)</span>
              </label>
              <input
                id="sessionTime"
                name="sessionTime"
                type="time"
                className={`${inputClass} [color-scheme:dark]`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="kart" className={labelClass}>
                Kart
              </label>
              <input id="kart" name="kart" type="text" placeholder="e.g. Kart 2" className={inputClass} />
            </div>
            <div>
              <label htmlFor="motor" className={labelClass}>
                Motor
              </label>
              <input
                id="motor"
                name="motor"
                type="text"
                placeholder="e.g. TM KZ10C #4"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-neutral-400">Weather conditions</h2>
          <button
            type="button"
            onClick={handleAutofill}
            disabled={autofill.state === "loading" || !trackName.trim()}
            className={secondaryButtonClass}
          >
            {autofill.state === "loading" ? "Looking up…" : "Auto-fill from track"}
          </button>
        </div>
        {autofill.state === "error" && (
          <p className="mb-3 text-xs text-red-400">{autofill.message}</p>
        )}
        {autofill.state === "done" && (
          <p className="mb-3 text-xs text-neutral-400">{autofill.message}</p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="temperature" className={labelClass}>
              Temperature
            </label>
            <input
              id="temperature"
              name="temperature"
              type="text"
              placeholder="e.g. 22C"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="windy" className={labelClass}>
              Windy
            </label>
            <select
              id="windy"
              name="windy"
              value={windy}
              onChange={(e) => setWindy(e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label htmlFor="trackTemp" className={labelClass}>
              Track temp <span className="font-normal text-neutral-500">(optional)</span>
            </label>
            <input
              id="trackTemp"
              name="trackTemp"
              type="text"
              placeholder="e.g. 34C"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="skyConditions" className={labelClass}>
              Sky
            </label>
            <select
              id="skyConditions"
              name="skyConditions"
              value={skyConditions}
              onChange={(e) => setSkyConditions(e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="sunny">Sunny</option>
              <option value="overcast">Overcast</option>
            </select>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <label htmlFor="setupNotes" className={labelClass}>
          Notes <span className="font-normal text-neutral-500">(optional)</span>
        </label>
        <textarea
          id="setupNotes"
          name="setupNotes"
          rows={3}
          placeholder="Anything else worth remembering about the day..."
          className={inputClass}
        />
      </div>

      <button type="submit" className={`self-start ${primaryButtonClass}`}>
        Add day
      </button>
    </form>
  );
}
