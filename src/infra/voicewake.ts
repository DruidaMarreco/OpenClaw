// Stores voice wake trigger configuration.
import path from "node:path";
import { normalizeOptionalString } from "@openclaw/normalization-core/string-coerce";
import { resolveStateDir } from "../config/paths.js";
import { createAsyncLock, tryReadJson, writeJson } from "./json-files.js";

// Voice wake config stores trigger words used by local voice integrations.
type VoiceWakeConfig = {
  triggers: string[];
  updatedAtMs: number;
};

const DEFAULT_TRIGGERS = ["openclaw", "claude", "computer"];

function resolvePath(baseDir?: string) {
  const root = baseDir ?? resolveStateDir();
  return path.join(root, "settings", "voicewake.json");
}

function sanitizeTriggers(triggers: string[] | undefined | null): string[] {
  const cleaned = (triggers ?? [])
    .map((w) => normalizeOptionalString(w) ?? "")
    .filter((w) => w.length > 0);
  return cleaned.length > 0 ? cleaned : DEFAULT_TRIGGERS;
}

const withLock = createAsyncLock();

/** Return the built-in voice wake trigger list. */
export function defaultVoiceWakeTriggers() {
  return [...DEFAULT_TRIGGERS];
}

/**
 * Return true when the given trigger list exactly matches the factory defaults
 * in the same order. Used by voicewake.status to tell clients whether the list
 * has ever been customized.
 */
export function isDefaultVoiceWakeTriggers(triggers: string[]): boolean {
  return (
    triggers.length === DEFAULT_TRIGGERS.length &&
    triggers.every((t, i) => t === DEFAULT_TRIGGERS[i])
  );
}

/** Load persisted voice wake triggers, falling back to defaults. */
export async function loadVoiceWakeConfig(baseDir?: string): Promise<VoiceWakeConfig> {
  const filePath = resolvePath(baseDir);
  const existing = await tryReadJson<VoiceWakeConfig>(filePath);
  if (!existing) {
    return { triggers: defaultVoiceWakeTriggers(), updatedAtMs: 0 };
  }
  return {
    triggers: sanitizeTriggers(existing.triggers),
    updatedAtMs:
      typeof existing.updatedAtMs === "number" && existing.updatedAtMs > 0
        ? existing.updatedAtMs
        : 0,
  };
}

/** Persist the configured voice wake trigger list. */
export async function setVoiceWakeTriggers(
  triggers: string[],
  baseDir?: string,
): Promise<VoiceWakeConfig> {
  const sanitized = sanitizeTriggers(triggers);
  const filePath = resolvePath(baseDir);
  return await withLock(async () => {
    const next: VoiceWakeConfig = {
      triggers: sanitized,
      updatedAtMs: Date.now(),
    };
    await writeJson(filePath, next);
    return next;
  });
}
