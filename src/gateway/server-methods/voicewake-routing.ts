// Gateway RPC handlers for voice wake routing configuration.
import { ErrorCodes, errorShape } from "../../../packages/gateway-protocol/src/index.js";
import {
  isDefaultVoiceWakeRoutingConfig,
  loadVoiceWakeRoutingConfig,
  normalizeVoiceWakeRoutingConfig,
  resetVoiceWakeRoutingConfig,
  resolveVoiceWakeRouteWithMatch,
  setVoiceWakeRoutingConfig,
  validateVoiceWakeRoutingConfigInput,
} from "../../infra/voicewake-routing.js";
import type { GatewayRequestHandlers } from "./types.js";

/** Gateway request handlers for reading and updating voice wake routing. */
export const voicewakeRoutingHandlers: GatewayRequestHandlers = {
  "voicewake.routing.get": async ({ respond }) => {
    try {
      respond(true, { config: await loadVoiceWakeRoutingConfig() });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },
  "voicewake.routing.resolve": async ({ params, respond }) => {
    if (!params || typeof params.trigger !== "string") {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          "voicewake.routing.resolve requires trigger: string",
        ),
      );
      return;
    }
    try {
      const config = await loadVoiceWakeRoutingConfig();
      const { target, matched } = resolveVoiceWakeRouteWithMatch({
        trigger: params.trigger,
        config,
      });
      respond(true, { target, matched });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },
  "voicewake.routing.status": async ({ respond }) => {
    try {
      const config = await loadVoiceWakeRoutingConfig();
      respond(true, {
        config,
        isDefault: isDefaultVoiceWakeRoutingConfig(config),
      });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },
  "voicewake.routing.reset": async ({ respond, context }) => {
    try {
      const config = await resetVoiceWakeRoutingConfig();
      context.broadcastVoiceWakeRoutingChanged(config);
      respond(true, { config });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },
  "voicewake.routing.set": async ({ params, respond, context }) => {
    if (
      !params ||
      params.config === null ||
      typeof params.config !== "object" ||
      Array.isArray(params.config)
    ) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "voicewake.routing.set requires config: object"),
      );
      return;
    }
    const validated = validateVoiceWakeRoutingConfigInput(params.config);
    if (!validated.ok) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, validated.message));
      return;
    }
    try {
      // Validate first for caller-friendly errors, then normalize before
      // persistence so broadcasts carry the canonical routing shape.
      const normalized = normalizeVoiceWakeRoutingConfig(params.config);
      const config = await setVoiceWakeRoutingConfig(normalized);
      context.broadcastVoiceWakeRoutingChanged(config);
      respond(true, { config });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },
};
