// Covers voice wake trigger defaults, sanitization, and persistence.
import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { withTempDir } from "../test-utils/temp-dir.js";
import {
  defaultVoiceWakeTriggers,
  loadVoiceWakeConfig,
  resetVoiceWakeTriggers,
  setVoiceWakeTriggers,
} from "./voicewake.js";

describe("voicewake config", () => {
  it("returns defaults when missing", async () => {
    await withTempDir("openclaw-voicewake-", async (baseDir) => {
      await expect(loadVoiceWakeConfig(baseDir)).resolves.toEqual({
        triggers: defaultVoiceWakeTriggers(),
        updatedAtMs: 0,
      });
    });
  });

  it("sanitizes and persists triggers", async () => {
    await withTempDir("openclaw-voicewake-", async (baseDir) => {
      const saved = await setVoiceWakeTriggers(["  hi  ", "", "  there "], baseDir);
      expect(saved.triggers).toEqual(["hi", "there"]);
      expect(saved.updatedAtMs).toBeGreaterThan(0);

      await expect(loadVoiceWakeConfig(baseDir)).resolves.toEqual({
        triggers: ["hi", "there"],
        updatedAtMs: saved.updatedAtMs,
      });
    });
  });

  it('includes "hey claude" in the default trigger list', () => {
    expect(defaultVoiceWakeTriggers()).toContain("hey claude");
  });

  it("reset overwrites custom triggers with defaults and updates timestamp", async () => {
    await withTempDir("openclaw-voicewake-", async (baseDir) => {
      await setVoiceWakeTriggers(["custom"], baseDir);
      const reset = await resetVoiceWakeTriggers(baseDir);
      expect(reset.triggers).toEqual(defaultVoiceWakeTriggers());
      expect(reset.updatedAtMs).toBeGreaterThan(0);

      const loaded = await loadVoiceWakeConfig(baseDir);
      expect(loaded.triggers).toEqual(defaultVoiceWakeTriggers());
    });
  });

  it("falls back to defaults for empty or malformed persisted values", async () => {
    await withTempDir("openclaw-voicewake-", async (baseDir) => {
      const emptySaved = await setVoiceWakeTriggers(["", "   "], baseDir);
      expect(emptySaved.triggers).toEqual(defaultVoiceWakeTriggers());

      await fs.mkdir(path.join(baseDir, "settings"), { recursive: true });
      await fs.writeFile(
        path.join(baseDir, "settings", "voicewake.json"),
        JSON.stringify({
          triggers: ["  wake ", "", 42, null],
          updatedAtMs: -1,
        }),
        "utf8",
      );

      await expect(loadVoiceWakeConfig(baseDir)).resolves.toEqual({
        triggers: ["wake"],
        updatedAtMs: 0,
      });
    });
  });
});
