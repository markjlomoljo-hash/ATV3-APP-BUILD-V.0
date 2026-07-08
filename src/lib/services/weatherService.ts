// Server-side weather provider integration. Open-Meteo requires no API key,
// so no secret ever needs to reach the client — this module is the only
// place that talks to the provider.
import { decodeGeohashCentroid } from "@/lib/geohash";

export interface WeatherFetchResult {
  temperatureC: number | null;
  humidityPct: number | null;
  uvIndex: number | null;
  airQualityIndex: number | null;
  confidence: "measured" | "insufficient_data";
  rawPayload: unknown;
}

export async function fetchWeatherForGeohash(geohash: string): Promise<WeatherFetchResult> {
  const { latitude, longitude } = decodeGeohashCentroid(geohash);

  try {
    const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
    forecastUrl.searchParams.set("latitude", latitude.toFixed(2));
    forecastUrl.searchParams.set("longitude", longitude.toFixed(2));
    forecastUrl.searchParams.set("current", "temperature_2m,relative_humidity_2m,uv_index");
    forecastUrl.searchParams.set("timezone", "auto");

    const forecastRes = await fetch(forecastUrl, { cache: "no-store" });
    if (!forecastRes.ok) {
      return {
        temperatureC: null,
        humidityPct: null,
        uvIndex: null,
        airQualityIndex: null,
        confidence: "insufficient_data",
        rawPayload: { error: `forecast_status_${forecastRes.status}` },
      };
    }
    const forecastJson = await forecastRes.json();
    const current = forecastJson.current ?? {};

    let airQualityIndex: number | null = null;
    try {
      const aqUrl = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
      aqUrl.searchParams.set("latitude", latitude.toFixed(2));
      aqUrl.searchParams.set("longitude", longitude.toFixed(2));
      aqUrl.searchParams.set("current", "us_aqi");
      const aqRes = await fetch(aqUrl, { cache: "no-store" });
      if (aqRes.ok) {
        const aqJson = await aqRes.json();
        airQualityIndex = aqJson?.current?.us_aqi ?? null;
      }
    } catch {
      airQualityIndex = null;
    }

    return {
      temperatureC: current.temperature_2m ?? null,
      humidityPct: current.relative_humidity_2m ?? null,
      uvIndex: current.uv_index ?? null,
      airQualityIndex,
      confidence: "measured",
      rawPayload: { forecast: current, airQualityIndex },
    };
  } catch (err) {
    return {
      temperatureC: null,
      humidityPct: null,
      uvIndex: null,
      airQualityIndex: null,
      confidence: "insufficient_data",
      rawPayload: { error: err instanceof Error ? err.message : "unknown_error" },
    };
  }
}
