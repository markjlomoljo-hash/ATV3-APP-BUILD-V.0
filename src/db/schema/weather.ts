// Weather & environmental context. All provider calls happen server-side;
// clients never receive provider API keys.
import {
  index,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./core";

export const locationPreferences = pgTable("location_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  // granted | denied | not_requested
  permissionState: varchar("permission_state", { length: 20 }).notNull().default("not_requested"),
  // coarse geohash (never store precise GPS)
  geohash: varchar("geohash", { length: 12 }),
  labelName: varchar("label_name", { length: 120 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const weatherSnapshots = pgTable(
  "weather_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    geohash: varchar("geohash", { length: 12 }).notNull(),
    source: varchar("source", { length: 40 }).notNull().default("open-meteo"),
    capturedAt: timestamp("captured_at", { withTimezone: true }).defaultNow().notNull(),
    temperatureC: numeric("temperature_c", { precision: 5, scale: 2 }),
    humidityPct: numeric("humidity_pct", { precision: 5, scale: 2 }),
    uvIndex: numeric("uv_index", { precision: 4, scale: 2 }),
    airQualityIndex: numeric("air_quality_index", { precision: 6, scale: 2 }),
    // measured | interpolated | insufficient_data
    confidence: varchar("confidence", { length: 20 }).notNull().default("measured"),
    rawPayload: jsonb("raw_payload"),
  },
  (t) => [index("weather_snapshots_user_id_idx").on(t.userId)],
);

export const dbSchemaWeatherMarker = true;
