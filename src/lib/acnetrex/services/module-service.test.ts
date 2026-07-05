import { describe, expect, it } from "vitest";
import { ACNETREX_MODULES, moduleById } from "../modules/module-registry";
import { buildModuleWorkflow } from "./module-service";

describe("module workflow models", () => {
  it("gives every routed module a visible action, form, history, and readiness body", () => {
    for (const moduleConfig of ACNETREX_MODULES) {
      const workflow = buildModuleWorkflow(moduleConfig);

      expect(workflow.primaryAction.length, moduleConfig.id).toBeGreaterThan(4);
      expect(workflow.formTitle.length, moduleConfig.id).toBeGreaterThan(4);
      expect(workflow.fields.length, moduleConfig.id).toBeGreaterThan(0);
      expect(workflow.historyEmptyState, moduleConfig.id).toMatch(/No|until|requires|require/i);
      expect(workflow.integrationChecks.length, moduleConfig.id).toBeGreaterThan(0);
      expect(workflow.capabilityCards.length, moduleConfig.id).toBeGreaterThan(0);
      expect(workflow.safetyNotes.length, moduleConfig.id).toBeGreaterThan(0);
    }
  });

  it("keeps FaceAtlas and Skin Twin behind the server ML proxy without fake output claims", () => {
    const faceAtlas = moduleById.get("face-atlas");
    const skinTwin = moduleById.get("skin-twin");
    expect(faceAtlas).toBeDefined();
    expect(skinTwin).toBeDefined();

    const faceAtlasWorkflow = buildModuleWorkflow(faceAtlas!);
    const skinTwinWorkflow = buildModuleWorkflow(skinTwin!);

    expect(faceAtlasWorkflow.serviceEndpoint).toBe("/api/ml/predict");
    expect(skinTwinWorkflow.serviceEndpoint).toBe("/api/ml/predict");
    expect(faceAtlasWorkflow.safetyNotes.join(" ")).toMatch(/No lesion detection/i);
    expect(skinTwinWorkflow.safetyNotes.join(" ")).toMatch(/must not generate/i);
  });

  it("keeps CutisAI evidence and memory unavailable until backend tools are configured", () => {
    const cutisai = moduleById.get("cutisai");
    expect(cutisai).toBeDefined();

    const workflow = buildModuleWorkflow(cutisai!);
    expect(workflow.integrationChecks.some((check) => check.status === "evidence_unavailable")).toBe(true);
    expect(workflow.historyEmptyState).toMatch(/memory persistence/i);
    expect(workflow.safetyNotes.join(" ")).toMatch(/must not diagnose/i);
  });
});
