---
summary: "Global voice wake words (Gateway-owned) and how they sync across nodes"
read_when:
  - Changing voice wake words behavior or defaults
  - Adding new node platforms that need wake word sync
title: "Voice wake"
---

OpenClaw treats **wake words as a single global list** owned by the **Gateway**.

- There are **no per-node custom wake words**.
- **Any node/app UI may edit** the list; changes are persisted by the Gateway and broadcast to everyone.
- macOS and iOS keep local **Voice Wake enabled/disabled** toggles (local UX + permissions differ).
- Android currently keeps Voice Wake off and uses a manual mic flow in the Voice tab.

## Storage (Gateway host)

Wake words are stored on the gateway machine at:

- `~/.openclaw/settings/voicewake.json`

Shape:

```json
{ "triggers": ["openclaw", "claude", "computer"], "updatedAtMs": 1730000000000 }
```

## Protocol

### Methods

- `voicewake.get` → `{ triggers: string[] }`
- `voicewake.set` with params `{ triggers: string[] }` → `{ triggers: string[] }`
- `voicewake.reset` → `{ triggers: string[] }` — clears custom triggers and restores factory defaults (`["openclaw", "claude", "computer"]`), then broadcasts `voicewake.changed`

Notes:

- Triggers are normalized (trimmed, empties dropped). Empty lists fall back to defaults.
- Limits are enforced for safety (count/length caps).

### Routing methods (trigger → target)

- `voicewake.routing.get` → `{ config: VoiceWakeRoutingConfig }`
- `voicewake.routing.set` with params `{ config: VoiceWakeRoutingConfig }` → `{ config: VoiceWakeRoutingConfig }`
- `voicewake.routing.status` → `{ config: VoiceWakeRoutingConfig, isDefault: boolean }` — current routing config plus metadata; `isDefault` is true when there are no custom routes and the defaultTarget is `{ mode: "current" }`, and can be used to show or hide a "Reset to defaults" control
- `voicewake.routing.reset` → `{ config: VoiceWakeRoutingConfig }` — clears all custom routes and restores factory defaults (`defaultTarget: { mode: "current" }`, empty routes), then broadcasts `voicewake.routing.changed`

`VoiceWakeRoutingConfig` shape:

```json
{
  "version": 1,
  "defaultTarget": { "mode": "current" },
  "routes": [{ "trigger": "robot wake", "target": { "sessionKey": "agent:main:main" } }],
  "updatedAtMs": 1730000000000
}
```

Route targets support exactly one of:

- `{ "mode": "current" }`
- `{ "agentId": "main" }`
- `{ "sessionKey": "agent:main:main" }`

### Events

- `voicewake.changed` payload `{ triggers: string[] }`
- `voicewake.routing.changed` payload `{ config: VoiceWakeRoutingConfig }`

Who receives it:

- All WebSocket clients (macOS app, WebChat, etc.)
- All connected nodes (iOS/Android), and also on node connect as an initial "current state" push.

## Client behavior

### macOS app

- Uses the global list to gate `VoiceWakeRuntime` triggers.
- Editing "Trigger words" in Voice Wake settings calls `voicewake.set` and then relies on the broadcast to keep other clients in sync.

### iOS node

- Uses the global list for `VoiceWakeManager` trigger detection.
- Editing Wake Words in Settings calls `voicewake.set` (over the Gateway WS) and also keeps local wake-word detection responsive.

### Android node

- Voice Wake is currently disabled in Android runtime/Settings.
- Android voice uses manual mic capture in the Voice tab instead of wake-word triggers.

## Related

- [Talk mode](/nodes/talk)
- [Audio and voice notes](/nodes/audio)
- [Media understanding](/nodes/media-understanding)
