# Engagement Platform Router

Purpose: turn promo-video participation into safe, trackable free-app/resource distribution.

## Campaign contract

```json
{
  "appId": "APP_CONTENT_OS",
  "templateAgentId": "AGENT_DASHBOARD_PROMO",
  "platforms": ["Instagram","Facebook","YouTube","TikTok","Threads"],
  "triggerType": "COMMENT_KEYWORD",
  "keyword": "무료앱",
  "offerName": "Content OS Free App",
  "offerUrl": "https://example.com/free",
  "deliveryPolicy": "OFFICIAL_API_ONLY",
  "fallbackPolicy": "PUBLIC_REPLY_OR_LANDING_LINK"
}
```

## Routing principle

The runtime connector must check the platform/account's currently approved official capability before private delivery.

- If official direct/private reply is available for the connected account and event type: use it and log provider message id.
- If not: use a public reply containing the approved landing link, pinned comment/description where suitable, or queue a manual follow-up.
- Never emulate a logged-in person to mass-DM through browser automation.

## Required controls

- one delivery per participant/campaign unless explicitly re-opted in,
- duplicate event detection,
- configurable rate limit,
- opt-out/suppression field,
- delivery result readback,
- failed-delivery retry ceiling,
- campaign pause switch,
- no secrets or personal data in video/analytics payloads.

## Chrome bridge role

Chrome may support operator-visible capture/readback and workflows that are allowed by platform terms, but it must not be used to bypass API limitations for automated private messaging. Unsupported private delivery stays in fallback/manual state.
