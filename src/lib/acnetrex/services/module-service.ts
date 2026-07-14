import type { AcneTrexModule } from "@/lib/acnetrex/modules/module-registry";
import type { ModuleReadiness } from "@/lib/acnetrex/module-result";

export type ModuleFormField = {
  name: string;
  label: string;
  type: "text" | "date" | "time" | "number" | "textarea" | "select" | "checkbox";
  placeholder?: string;
  help: string;
  options?: string[];
  required?: boolean;
};

export type ModuleIntegrationCheck = {
  label: string;
  status: ModuleReadiness;
  detail: string;
};

export type ModuleWorkflowModel = {
  primaryAction: string;
  formTitle: string;
  formDescription: string;
  fields: ModuleFormField[];
  historyTitle: string;
  historyEmptyState: string;
  missingDataActions: string[];
  safetyNotes: string[];
  integrationChecks: ModuleIntegrationCheck[];
  capabilityCards: ModuleIntegrationCheck[];
  serviceEndpoint?: string;
};

const dailyLogFields: ModuleFormField[] = [
  {
    name: "logDate",
    label: "Log date",
    type: "date",
    help: "Used as the source date for daily feature snapshots.",
    required: true,
  },
  {
    name: "intensity",
    label: "Observed intensity",
    type: "number",
    placeholder: "0-10",
    help: "A self-observed input only; it is not an acne severity score.",
  },
  {
    name: "notes",
    label: "Context notes",
    type: "textarea",
    placeholder: "Add context you want reflected in reports or future pattern checks.",
    help: "Stored only through the module service when a signed database session is available.",
  },
];

function checksFor(moduleConfig: AcneTrexModule, additional: ModuleIntegrationCheck[] = []): ModuleIntegrationCheck[] {
  return [
    {
      label: "Account session",
      status: moduleConfig.requiresAuth ? "auth_required" : "ready",
      detail: moduleConfig.requiresAuth
        ? "A signed Supabase session is required before this module can save personal records."
        : "This surface can render before sign-in, but personal writes still require a signed session.",
    },
    {
      label: "Persistence",
      status: moduleConfig.dataTables.length > 0 ? moduleConfig.serviceStatus : "ready",
      detail:
        moduleConfig.dataTables.length > 0
          ? `Expected table contract: ${moduleConfig.dataTables.join(", ")}.`
          : "No database table is required for the current route body.",
    },
    {
      label: "Consent",
      status: moduleConfig.requiresConsentScopes.length > 0 ? "consent_required" : "ready",
      detail:
        moduleConfig.requiresConsentScopes.length > 0
          ? `Required scope(s): ${moduleConfig.requiresConsentScopes.join(", ")}.`
          : "No additional consent scope is required beyond account privacy defaults.",
    },
    ...additional,
  ];
}

function defaultWorkflow(moduleConfig: AcneTrexModule): ModuleWorkflowModel {
  return {
    primaryAction: "Prepare source record",
    formTitle: `${moduleConfig.name} input`,
    formDescription:
      "This surface captures structured source data and blocks production saves until the service boundary is available.",
    fields: dailyLogFields,
    historyTitle: `${moduleConfig.name} records`,
    historyEmptyState: "No durable records are loaded in this preview because a signed database session is required.",
    missingDataActions: moduleConfig.missingSurfaces,
    safetyNotes: [
      "Outputs stay unavailable until required records, consent, and service integrations are verified.",
      "The app must never treat a preview form entry as durable clinical truth.",
    ],
    integrationChecks: checksFor(moduleConfig),
    capabilityCards: [
      {
        label: "Structured input contract",
        status: "ready",
        detail: "The route can collect validated source data, then hand it to persistence once a signed session is available.",
      },
      {
        label: "Personalized output",
        status: moduleConfig.serviceStatus,
        detail: "Personalized output remains unavailable until the module has durable records and verified service access.",
      },
    ],
  };
}

export function buildModuleWorkflow(moduleConfig: AcneTrexModule): ModuleWorkflowModel {
  switch (moduleConfig.id) {
    case "sleepderm":
      return {
        primaryAction: "Log sleep window",
        formTitle: "SleepDerm log",
        formDescription:
          "Capture bedtime, wake time, interruptions, and subjective recovery so the deterministic sleep engine can calculate duration and debt after persistence is available.",
        fields: [
          { name: "logDate", label: "Sleep date", type: "date", help: "The date assigned to this sleep record.", required: true },
          { name: "bedtime", label: "Bedtime", type: "time", help: "Used to calculate sleep duration and midpoint.", required: true },
          { name: "wakeTime", label: "Wake time", type: "time", help: "Overnight wake handling is part of the service contract.", required: true },
          { name: "wakeups", label: "Overnight wakeups", type: "number", placeholder: "0", help: "Supports recovery opportunity and interruption features." },
          { name: "sleepQuality", label: "Sleep quality", type: "select", options: ["low", "medium", "high"], help: "Self-reported context; not a sleep-stage claim." },
        ],
        historyTitle: "Sleep logs",
        historyEmptyState: "No sleep logs are loaded until a signed Supabase session can read sleep_logs.",
        missingDataActions: ["Save and reload a signed sleep_logs record", "Accumulate 7-14 days before acne correlation is attempted"],
        safetyNotes: ["SleepDerm can calculate duration and debt, but it does not infer sleep stages without wearable data."],
        integrationChecks: checksFor(moduleConfig, [
          {
            label: "Deterministic sleep engine",
            status: "ready",
            detail: "Duration/debt calculations can run locally once validated inputs are present.",
          },
        ]),
        capabilityCards: [
          { label: "Duration across midnight", status: "ready", detail: "Local deterministic logic handles bedtime/wake windows that cross midnight." },
          { label: "Sleep debt windows", status: "ready", detail: "3, 7, 14, and 30-day debt contracts exist, with insufficient-data states for sparse records." },
          { label: "Acne correlation", status: "insufficient_data", detail: "Correlation stays unavailable until repeated sleep and skin outcome records exist." },
        ],
      };

    case "dermdiet":
      return {
        primaryAction: "Log meal or snack",
        formTitle: "DermDiet log",
        formDescription:
          "Track meal baseline, snack sub-events, and category exposure windows without judgment or unsupported causation claims.",
        fields: [
          { name: "logDate", label: "Food date", type: "date", help: "The date assigned to this food record.", required: true },
          { name: "baselineMeals", label: "Expected meals today", type: "number", placeholder: "3", help: "Supports meal-frequency adaptation." },
          { name: "entryType", label: "Entry type", type: "select", options: ["breakfast", "lunch", "dinner", "snack"], help: "Snack entries are modeled as sub-events." },
          { name: "category", label: "Observed category", type: "select", options: ["dairy", "high glycemic", "processed", "sugary snack", "caffeine", "balanced meal"], help: "Used for exposure windows only after enough outcomes exist." },
          { name: "notes", label: "Context notes", type: "textarea", help: "Optional context for reports and future pattern analysis." },
        ],
        historyTitle: "Food logs",
        historyEmptyState: "No food logs are loaded until food_logs can be read for the signed account.",
        missingDataActions: ["Verify live food_logs writes", "Collect repeated skin outcome records before association testing"],
        safetyNotes: ["DermDiet must not shame food choices or label a single meal as causal."],
        integrationChecks: checksFor(moduleConfig),
        capabilityCards: [
          { label: "Meal baseline completion", status: "ready", detail: "Local logic can calculate expected-meal completion and explicit missingness." },
          { label: "Snack sub-events", status: "ready", detail: "Snack entries append as sub-events instead of duplicating the parent day log." },
          { label: "Food-skin association", status: "insufficient_data", detail: "Association output requires repeated food logs and skin outcome records." },
        ],
      };

    case "face-atlas":
    case "face-atlas-capture":
    case "face-atlas-annotations":
    case "face-atlas-history":
      return {
        primaryAction: moduleConfig.id === "face-atlas-annotations" ? "Prepare annotation" : "Prepare capture",
        formTitle: moduleConfig.id === "face-atlas-annotations" ? "Annotation draft" : "Five-angle capture checklist",
        formDescription:
          "FaceAtlas starts with user-guided capture and annotation. Cloud analysis is queued only when private storage, consent, and ML health are verified.",
        fields:
          moduleConfig.id === "face-atlas-annotations"
            ? [
                { name: "scanId", label: "Scan ID", type: "text", placeholder: "UUID from saved scan", help: "Required to attach annotations to a durable scan." },
                { name: "lesionType", label: "Lesion type", type: "select", options: ["papule", "pustule", "comedone", "nodule", "cyst", "PIH", "PIE", "scar", "uncertain"], help: "User-guided taxonomy; model disagreement is stored separately." },
                { name: "zone", label: "Facial zone", type: "select", options: ["forehead", "left cheek", "right cheek", "chin", "jawline", "nose", "perioral"], help: "Zone mapping powers reports, forecasts, and Skin Twin." },
                { name: "certainty", label: "User certainty", type: "number", placeholder: "0-100", help: "Used to handle model-user disagreement honestly." },
              ]
            : [
                { name: "front", label: "Front angle captured", type: "checkbox", help: "One of five required FaceAtlas angles." },
                { name: "left", label: "Left angle captured", type: "checkbox", help: "Supports zone comparison and longitudinal alignment." },
                { name: "right", label: "Right angle captured", type: "checkbox", help: "Supports zone comparison and longitudinal alignment." },
                { name: "rawRetention", label: "Raw image retention consent", type: "checkbox", help: "If off, only derived metadata and annotations should be retained." },
                { name: "notes", label: "Capture notes", type: "textarea", help: "Lighting, makeup, shaving, or irritation context." },
              ],
        historyTitle: "FaceAtlas scan history",
        historyEmptyState: "No scan history is loaded until private storage and user-owned scan tables are verified.",
        missingDataActions: ["Verify private face-scans-raw bucket", "Persist scan metadata", "Queue Cloud Run analysis without fake detection"],
        safetyNotes: ["No lesion detection appears until a real model/service returns validated output."],
        integrationChecks: checksFor(moduleConfig, [
          {
            label: "ML inference",
            status: "queued_for_cloud",
            detail: "FaceAtlas must call /api/ml/predict and accept 503/readiness errors without fabricating lesions.",
          },
        ]),
        capabilityCards: [
          { label: "Five-angle checklist", status: "ready", detail: "Capture readiness validates front, left, right, chin-up, and forehead angles." },
          { label: "Raw image retention mode", status: "ready", detail: "The contract supports derived-only mode when raw image retention consent is off." },
          { label: "Lesion inference", status: "queued_for_cloud", detail: "Lesion detection remains queued for Cloud Run and cannot be fabricated locally." },
        ],
        serviceEndpoint: "/api/ml/predict",
      };

    case "skin-twin":
    case "skin-twin-scenarios":
    case "skin-twin-history":
      return {
        primaryAction: "Draft scenario",
        formTitle: "Skin Twin scenario",
        formDescription:
          "Build scenario inputs and readiness checks. Projections remain blocked until sufficient FaceAtlas, log, treatment, and outcome records exist.",
        fields: [
          { name: "name", label: "Scenario name", type: "text", placeholder: "Better sleep and routine consistency", help: "Saved scenario label." },
          { name: "window", label: "Simulation window", type: "select", options: ["3 days", "7 days", "14 days", "30 days", "treatment cycle", "provider review"], help: "Supported PRD windows only." },
          { name: "variables", label: "Variables changed", type: "select", options: ["better sleep", "reduced sleep debt", "routine consistency", "treatment adherence", "reduced contact exposure", "lower stress"], help: "Active variables are validated before simulation." },
          { name: "providerReview", label: "Provider-review timeline", type: "checkbox", help: "Required for custom provider timelines or treatment-cycle assumptions." },
        ],
        historyTitle: "Saved Skin Twin scenarios",
        historyEmptyState: "No saved scenarios are loaded until skin_twin persistence is verified.",
        missingDataActions: ["Collect FaceAtlas derived data", "Collect repeated daily logs", "Verify simulation result persistence"],
        safetyNotes: ["Skin Twin must not generate guaranteed after photos or exact outcomes from sparse data."],
        integrationChecks: checksFor(moduleConfig, [
          {
            label: "Scenario engine",
            status: "insufficient_data",
            detail: "The UI can validate scenarios now, but projection output requires sufficient records and a real model response.",
          },
        ]),
        capabilityCards: [
          { label: "Scenario validation", status: "ready", detail: "Supported variables and time windows are constrained by the Skin Twin schema." },
          { label: "Readiness gate", status: "ready", detail: "Local logic identifies missing FaceAtlas, skin outcome, log, and treatment inputs." },
          { label: "Projection output", status: "insufficient_data", detail: "No direction, magnitude, or visual projection appears without sufficient records and model output." },
        ],
        serviceEndpoint: "/api/ml/predict",
      };

    case "cutisai":
    case "ai-workspace":
    case "intelligence":
      return {
        primaryAction: "Check assistant readiness",
        formTitle: "CutisAI message",
        formDescription:
          "Ask a question only after backend tools, memory, and evidence retrieval are configured. In this preview, the assistant exposes missing services instead of inventing advice.",
        fields: [
          { name: "message", label: "Question", type: "textarea", placeholder: "What data is missing before you can assess my patterns?", help: "Messages are bounded and routed through backend tools when configured." },
          { name: "memory", label: "Use personal memory", type: "checkbox", help: "Requires Supabase-backed memory tables and consent." },
          { name: "evidence", label: "Retrieve evidence", type: "checkbox", help: "Unavailable while evidence retrieval is not configured." },
        ],
        historyTitle: "Conversation history",
        historyEmptyState: "No CutisAI conversation history is loaded until memory persistence is configured.",
        missingDataActions: ["Verify memory tables", "Configure evidence retrieval", "Route assistant through server-only tools"],
        safetyNotes: ["CutisAI must not diagnose, prescribe, or cite evidence that was not retrieved."],
        integrationChecks: checksFor(moduleConfig, [
          {
            label: "Evidence retrieval",
            status: "evidence_unavailable",
            detail: "Responses must state evidence_unavailable until a reputable retrieval service is connected.",
          },
        ]),
        capabilityCards: [
          { label: "Message contract", status: "ready", detail: "Messages are bounded and tool requests are explicit." },
          { label: "Memory retrieval", status: "not_configured", detail: "Persistent memory remains unavailable until Supabase memory tables are verified." },
          { label: "Evidence retrieval", status: "evidence_unavailable", detail: "CutisAI must state evidence is unavailable instead of inventing citations." },
        ],
        serviceEndpoint: "/api/cutisai/memory/status",
      };

    case "reports":
    case "report-history":
    case "report-export":
      return {
        primaryAction: "Request report",
        formTitle: "Report request",
        formDescription:
          "Prepare a dermatologist-ready report request with missing-data disclosure and consent snapshot. No PDF is marked ready until the worker and private storage succeed.",
        fields: [
          { name: "reportType", label: "Report type", type: "select", options: ["dermatologist", "progress", "export"], help: "Determines report scope and consent snapshot." },
          { name: "includeFaceAtlas", label: "Include FaceAtlas", type: "checkbox", help: "Only derived/retained records are included according to raw-image consent." },
          { name: "includeFoodSleep", label: "Include food and sleep", type: "checkbox", help: "Includes available SleepDerm and DermDiet logs with missing-data notes." },
          { name: "notes", label: "Provider notes", type: "textarea", help: "Optional context for report request only." },
        ],
        historyTitle: "Report jobs",
        historyEmptyState: "No report jobs are loaded until report_requests and report_files are reachable.",
        missingDataActions: ["Verify report request persistence", "Verify private report storage", "Configure report worker"],
        safetyNotes: ["Reports must disclose missing data and avoid unsupported diagnosis or causation."],
        integrationChecks: checksFor(moduleConfig),
        capabilityCards: [
          { label: "Missing-data sections", status: "ready", detail: "Report readiness can identify missing profile, log, FaceAtlas, and treatment sections." },
          { label: "Report worker", status: "not_configured", detail: "PDF/file output remains unavailable until the report worker and private storage succeed." },
        ],
      };

    case "treatments":
    case "treatment-checkins":
    case "treatment-log":
      return {
        primaryAction: moduleConfig.id === "treatment-checkins" ? "Record check-in" : "Draft treatment plan",
        formTitle: moduleConfig.id === "treatment-checkins" ? "Treatment check-in" : "Treatment plan draft",
        formDescription:
          "Capture provider-directed treatment context, schedules, adherence, and tolerance. Safety validation blocks unsupported treatment recommendations.",
        fields: [
          { name: "name", label: "Plan or treatment name", type: "text", placeholder: "Provider-directed routine", help: "Used to identify the plan in tasks and reports." },
          { name: "startDate", label: "Start date", type: "date", help: "Supports treatment-cycle timelines." },
          { name: "providerDirected", label: "Provider directed", type: "checkbox", help: "Required before stronger treatment-cycle language is shown." },
          { name: "tolerance", label: "Tolerance notes", type: "textarea", help: "Irritation or stopping events should prompt provider-review guidance." },
        ],
        historyTitle: "Treatment activity",
        historyEmptyState: "No active treatment records are loaded until treatment tables are reachable.",
        missingDataActions: ["Persist plan draft", "Generate durable task schedule", "Record check-ins from active plan"],
        safetyNotes: ["The app must not start, stop, or change medications without provider confirmation."],
        integrationChecks: checksFor(moduleConfig),
        capabilityCards: [
          { label: "Safety framing", status: "ready", detail: "Treatment forms capture provider-directed context and tolerance notes without recommending medication changes." },
          { label: "Task generation", status: "insufficient_data", detail: "Task generation requires durable treatment schedules and signed persistence." },
        ],
      };

    case "tasks":
    case "gamification":
      return {
        primaryAction: "Review task readiness",
        formTitle: "Task completion source",
        formDescription:
          "Tasks, streaks, badges, and ranks must be derived from durable logs and treatment schedules rather than manual fake progress.",
        fields: [
          { name: "source", label: "Task source", type: "select", options: ["treatment plan", "missing sleep log", "missing food log", "report prep", "FaceAtlas capture"], help: "Task generation source." },
          { name: "dueDate", label: "Due date", type: "date", help: "Used for schedule and streak rules." },
          { name: "completed", label: "Completed", type: "checkbox", help: "Completion only counts after durable task persistence." },
        ],
        historyTitle: "Task and streak basis",
        historyEmptyState: "No tasks are loaded until task persistence is verified.",
        missingDataActions: ["Generate tasks from treatment schedules", "Persist completion events", "Compute streaks from durable completions"],
        safetyNotes: ["No badge, rank, or streak can be awarded from local-only preview state."],
        integrationChecks: checksFor(moduleConfig),
        capabilityCards: [
          { label: "No fake points", status: "ready", detail: "Task credit logic awards no points or streak eligibility without durable completion records." },
          { label: "Offline completion", status: "queued_for_cloud", detail: "Offline completions must queue for later sync before affecting streaks." },
        ],
      };

    case "readiness":
      return {
        primaryAction: "Check system health",
        formTitle: "Readiness check",
        formDescription:
          "Readiness combines app health, database connectivity, Cloud Run ML health, telemetry, and module sufficiency.",
        fields: [
          { name: "health", label: "Open /api/health", type: "checkbox", help: "Use the health endpoint to verify runtime dependencies without exposing secrets." },
          { name: "mlProxy", label: "Open /api/ml/predict contract", type: "checkbox", help: "Prediction requests must go through the server-side route." },
        ],
        historyTitle: "Runtime observations",
        historyEmptyState: "Runtime events require ml_runtime_events and a signed server-side telemetry writer.",
        missingDataActions: ["Verify DATABASE_URL", "Verify Cloud Run health", "Verify Vertex endpoint readiness"],
        safetyNotes: ["Readiness statuses must reflect real checks, not decorative progress."],
        integrationChecks: checksFor(moduleConfig, [
          { label: "Health endpoint", status: "ready", detail: "Use /api/health for fail-closed local and deployment diagnostics." },
        ]),
        capabilityCards: [
          { label: "Database readiness", status: "ready", detail: "The health route reports DB configuration and reachability without leaking values." },
          { label: "Cloud ML readiness", status: "ready", detail: "The health route treats placeholder HTML or metadata-only JSON as degraded, not healthy." },
        ],
        serviceEndpoint: "/api/health",
      };

    case "formula-lens":
    case "products":
    case "barrier":
      return {
        primaryAction: "Add product context",
        formTitle: "Product or routine input",
        formDescription:
          "Manual product and ingredient context can be captured before OCR/barcode providers are configured.",
        fields: [
          { name: "productName", label: "Product name", type: "text", help: "Manual entry until product search/OCR is configured." },
          { name: "brand", label: "Brand", type: "text", help: "Optional manual brand entry." },
          { name: "ingredients", label: "Ingredients", type: "textarea", help: "Ingredient text is not analyzed until evidence rules are configured." },
          { name: "patchTested", label: "Patch tested", type: "checkbox", help: "Supports safety notes and routine history." },
        ],
        historyTitle: "Product history",
        historyEmptyState: "No product history is loaded until product persistence is configured.",
        missingDataActions: ["Add product history table", "Connect ingredient evidence rules", "Configure OCR/barcode provider"],
        safetyNotes: ["Ingredient concerns must be evidence-backed and framed cautiously."],
        integrationChecks: checksFor(moduleConfig),
        capabilityCards: [
          { label: "Manual product entry", status: "ready", detail: "The route can collect product, brand, ingredient, and patch-test context." },
          { label: "Ingredient intelligence", status: "not_configured", detail: "Risk/conflict output remains unavailable until evidence-backed rules are configured." },
        ],
      };

    default:
      return defaultWorkflow(moduleConfig);
  }
}
