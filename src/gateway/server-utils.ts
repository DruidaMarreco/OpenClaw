// Gateway generic server utilities.
// Normalizes voice-wake triggers and formats unknown errors for logs/responses.
import { normalizeTrimmedStringList } from "@openclaw/normalization-core/string-normalization";
import {
  VOICEWAKE_MAX_TRIGGER_LENGTH,
  VOICEWAKE_MAX_TRIGGERS,
  defaultVoiceWakeTriggers,
} from "../infra/voicewake.js";

/**
 * Validate raw trigger input before normalization. Returns an error message when the
 * input would exceed enforced limits, or null when the input is acceptable.
 */
export function validateVoiceWakeTriggerInput(
  input: unknown,
): { ok: true } | { ok: false; message: string } {
  if (!Array.isArray(input)) {
    return { ok: false, message: "triggers must be an array" };
  }
  const strings = (input as unknown[]).filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
  if (strings.length > VOICEWAKE_MAX_TRIGGERS) {
    return {
      ok: false,
      message: `triggers must contain at most ${VOICEWAKE_MAX_TRIGGERS} entries`,
    };
  }
  for (const trigger of strings) {
    if (trigger.trim().length > VOICEWAKE_MAX_TRIGGER_LENGTH) {
      return {
        ok: false,
        message: `each trigger must be at most ${VOICEWAKE_MAX_TRIGGER_LENGTH} characters`,
      };
    }
  }
  return { ok: true };
}

/** Normalizes voice-wake trigger config with bounded count/length and defaults. */
export function normalizeVoiceWakeTriggers(input: unknown): string[] {
  const cleaned = normalizeTrimmedStringList(input)
    .slice(0, VOICEWAKE_MAX_TRIGGERS)
    .map((value) => value.slice(0, VOICEWAKE_MAX_TRIGGER_LENGTH));
  return cleaned.length > 0 ? cleaned : defaultVoiceWakeTriggers();
}

/** Formats unknown gateway errors without throwing on unusual status/code shapes. */
export function formatError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "string") {
    return err;
  }
  const statusValue = (err as { status?: unknown })?.status;
  const codeValue = (err as { code?: unknown })?.code;
  const hasStatus = statusValue !== undefined;
  const hasCode = codeValue !== undefined;
  if (hasStatus || hasCode) {
    const statusText =
      typeof statusValue === "string" || typeof statusValue === "number"
        ? String(statusValue)
        : "unknown";
    const codeText =
      typeof codeValue === "string" || typeof codeValue === "number"
        ? String(codeValue)
        : "unknown";
    return `status=${statusText} code=${codeText}`;
  }
  try {
    return JSON.stringify(err, null, 2);
  } catch {
    return String(err);
  }
}
