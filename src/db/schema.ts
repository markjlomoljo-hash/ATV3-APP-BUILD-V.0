// Central schema entrypoint. Domain tables live under src/db/schema/*.ts and
// are re-exported here so `drizzle-kit push` and `@/db/schema` imports work
// from a single module, as required by the project template.
export * from "./schema/core";
export * from "./schema/profile";
export * from "./schema/faceAtlas";
export * from "./schema/logs";
export * from "./schema/products";
export * from "./schema/weather";
export * from "./schema/ai";
export * from "./schema/treatment";
export * from "./schema/gamification";
export * from "./schema/reports";
