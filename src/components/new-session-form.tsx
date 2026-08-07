"use client";

import { useState } from "react";
import { createSession, getWeatherSuggestion } from "@/app/dashboard/actions";
import { cardClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/dark-ui";

type AutofillStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "done"; message: string };

export default function NewSessionForm() {
  const [trackName, setTrackName] = useState("");
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
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
              <label htmlFor="dayType" className={labelClass}>
                Race meeting or test day
              </label>
              <select id="dayType" name="dayType" defaultValue="test_day" className={inputClass}>
                <option value="test_day">Test day</option>
                <option value="race_meeting">Race meeting</option>
              </select>
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
