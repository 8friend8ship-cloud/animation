# Existing O3 Worship Device / Display-Controller Pilot / 2026-10-20

Existing lineage `DUAL_EYE_MULTI_BRAIN_BRIDGE_V1`. Existing template `HYMN_TEMPLATE_WORSHIP_V1` and `FC-LUMI-HYMN-TAB-FACTORY-V1`.
No new master song, TASK, PROJECT, NODE, PACK, Trigger or Gem.
Hosted under already existing `8friend8ship-cloud/animation/apps/hymn-karaoke-device` / existing Vercel `hymn-karaoke-device` production.
Existing accepted X41-B first-10.667-second Korean+English score clock unchanged, no new singer/music/audio published.
Existing karaoke Codex CLI review remains local-physical-approval PENDING; Cloud Codex screen does not authorize the old Windows CLI.

## BEFORE
- Existing verified `/` bilingual lyric pilot deployed and source hashed.
- No independent `/display` or `/control`, no real Bible text.
- Local Cross-device authenticated presenter bridge, projector kiosk, media loops and scripture liturgy not complete.

## EXECUTE
- `/control` mobile-friendly local pilot: numeric hymn 1–645 input + strict available source gate (only verified 8), prepare then GO LIVE, two X41 languages, 1/2 lines and size, playback seek, blank/nature standby, display link & QR.
- `/display`: monitor-only 16:9 fullscreen-oriented view, absolutely no form controls/buttons. Scene is hymn/source-score, silent procedural nature landscape, black, or scripture. Separate tab rooms use browser `BroadcastChannel`. Room key generated with `crypto.getRandomValues`, one local controller and read-only display. No externally authenticated same-account live bridge yet.
- `presentation-shared.js` preserves X41 canonical 0..1067 centisecond notes and only score-validated languages. Never runtime-audio-follow the backing music. B X41 '신'=7.33s visual start preserved.
- `1910 한국어 성경` official eBible source `https://ebible.org/Scriptures/kor_usfm.zip` marked Public Domain by https://ebible.org/bible/details.php?id=kor; source archive SHA256 `FEF4550220AD540B7358472E42DA651B7DCB1475359BDB4D2E388A912AC45E02`. Extracted EXACT official USFM genesis ch1 31 verses and Psalm ch23 six verses into `data/bible-1910-pilot.json`. Not modern NKRV. English, 66-book completion and edition changes need separate validation. Upstream kor source can omit verses in 1 Peter: do not claim complete entire Bible merely because 66 book names are present.
- Operator selects book/chapter/start/end verse; preview then live. Display text/edition/reference with measured viewport overflow reducing font size; next/previous verse from controller, or touch stage to request next. Unavailable chapter fails closed rather than hallucinated text.
- Removed duplicate older lags/bias from source clock, no new generation API calls or media renders.

## AFTER actual readback
- Vercel production deployment `READY` for source commit `4942aa584cb3115d3b4cb92296d866daf3e67810`.
- `https://hymn-karaoke-device.vercel.app/control` HTTP200; `/display` HTTP200.
- Chrome actual two-tab CDP pilot `WORSHIP_DISPLAY_CONTROL_LOCAL_RUNTIME_QA_20261020.json`, SHA256 `9542C12B2D86DC56DF2D786C2B440BF88E0DBF52252E9E9957C6CBC89D1FD578`: BroadcastChannel handshake, numeric hymn8 live, X41 신 7.33s 0%-fill onset, inactive hymn643 rejection, nature and blank and restore scenes PASS; monitor DOM no buttons/input/select.
- Chrome Bible QA `WORSHIP_BIBLE_PILOT_GUI_QA_20261020.json`, SHA256 `D43175E162D3EC192178D2A060D78AA8C4D87BA3C45BBB546194F20A3A31742F`: GEN1 verse1–3, display-touch next, PSA23 verse1–4, no overflow on PSA23:4, Genesis chapter2 unavailable block PASS.
- Initial automated Bible check triggered before control JS wiring, produced false negative; fixed test setup to await actual controller display link generated in JS before clicking, then source+scene runtime all PASS. No rewrite of accepted output to make a receipt look good.
- Files and QA traces remain in existing notebook path `integrations/remotion_pack/out`. Central record and electronic book appended separately.

## DELTA / limitations
- Existing one-device two-Chrome-tab pilot is real. Cross-device mobile/tablet to notebook/TV command transport is **NOT VERIFIED**, not remotely authorized; current QR opens a monitor/view link, not a remote control pairing with user accounts.
- Nature **procedural CSS animation** implemented; licensed nature MP4 seamless loop, local offline copy and watchdog restarting crashed browser NOT implemented.
- Hymn catalog supports a number keypad; actual ready media only hymn 8's first 10.667 seconds, other numbers blocked.
- Bible source only GEN1 and PSA23 pilot 37 verses; all 66 books are NOT implemented. Long multi-page verse splitting not fully generalized; sampled text fit tested.
- Lord's Prayer, Apostle's Creed, responsive reading, full worship service playlist, stage confidence monitor and public live room authorization are NOT implemented. Source rights and church edition must be chosen first.
- No claim that Codex cloud or local Codex review was executed; independent laptop local user physical approval remains required.

LAST_GOOD: Existing GitHub+Vercel O3 /control-/display same-browser live QA PASS + PD Bible 37 verse chapter pilot QA PASS.
FIRST_UNFINISHED: Reuse/verify existing authorized Firestore or notebook LAN bridge to support true independent Android control + projector; verify authenticated pairing, room role rules and reconnection, then complete Bible sources and church-approved liturgy sequentially.
