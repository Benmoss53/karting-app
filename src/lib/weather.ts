// Auto-fills weather conditions from Open-Meteo (no API key required for
// non-commercial use). Geocodes the track name to a location, then pulls
// that day's weather — the historical archive for past dates, the forecast
// endpoint for today/future.

export type WeatherSuggestion = {
  temperature: string;
  windy: boolean;
  skyConditions: "sunny" | "overcast";
  locationLabel: string;
};

type GeocodeResult = {
  latitude: number;
  longitude: number;
  label: string;
};

async function geocode(query: string): Promise<GeocodeResult | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    query,
  )}&count=1&language=en&format=json`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const result = data.results?.[0];
  if (!result) return null;

  const label = [result.name, result.admin1, result.country].filter(Boolean).join(", ");
  return { latitude: result.latitude, longitude: result.longitude, label };
}

// WMO weather codes collapsed to this app's two-value sky field — 0/1 are
// clear/mainly clear, everything else (cloud, fog, rain, storms) reads as
// overcast.
function skyFromWeatherCode(code: number): "sunny" | "overcast" {
  return code <= 1 ? "sunny" : "overcast";
}

const WINDY_THRESHOLD_KMH = 20;

export async function getWeatherForLocation(
  query: string,
  dateStr: string,
): Promise<WeatherSuggestion | { error: string }> {
  const location = await geocode(query);
  if (!location) {
    return { error: `Couldn't find a location matching "${query}" — enter weather manually.` };
  }

  const today = new Date().toISOString().slice(0, 10);
  const base =
    dateStr < today
      ? "https://archive-api.open-meteo.com/v1/archive"
      : "https://api.open-meteo.com/v1/forecast";

  const url =
    `${base}?latitude=${location.latitude}&longitude=${location.longitude}` +
    `&start_date=${dateStr}&end_date=${dateStr}` +
    `&daily=weather_code,temperature_2m_max,wind_speed_10m_max&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) {
    return { error: "Weather service is unavailable right now." };
  }

  const data = await res.json();
  const code = data.daily?.weather_code?.[0];
  const maxTemp = data.daily?.temperature_2m_max?.[0];
  const maxWind = data.daily?.wind_speed_10m_max?.[0];

  if (code == null || maxTemp == null) {
    return { error: `No weather data available for ${location.label} on ${dateStr}.` };
  }

  return {
    temperature: `${Math.round(maxTemp)}°C`,
    windy: (maxWind ?? 0) >= WINDY_THRESHOLD_KMH,
    skyConditions: skyFromWeatherCode(code),
    locationLabel: location.label,
  };
}
