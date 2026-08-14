# Whiteboard Renderer Integration

Date: 2026-08-15
Status: FRONT_INTEGRATED / COMPLETE_IMAGE_WORKFLOW_ALIGNED / RENDER_SERVICE_URL_REQUIRED

## Source

- Upstream: `geeklee/srt-whiteboard-animation`
- Pinned commit: `696a7243c0e6ffb6827676e539c2ca5ebae2bf6b`
- License: MIT
- Imported as Git submodule: `vendor/srt-whiteboard-animation`

## Architecture decision

The existing Animation Studio remains the primary front app. Whiteboard is a renderer mode inside the existing app, not a separate product.

Entry flow:

`index.tsx -> App.tsx -> Home | WhiteboardWorkspace`

The existing Home component remains preserved. `App.tsx` owns mode switching and the Whiteboard launcher.

## Canonical Whiteboard workflow

`SRT -> 25-35 sec scene grouping (target ~30 sec) -> one completed image per scene -> annotation.json region/sequence map -> Python/OpenCV renderer -> MP4`

This renderer is **not a text-to-video AI model** and does not need a paid external video-generation API for the drawing step. It takes an already completed scene image, discovers/reveals its line and color information, and redraws the image over time.

Each scene uses one finished canvas image containing the characters, background, and props together. Do not cut characters or props into separate image files just to animate them. Drawing order is controlled by semantic regions in `annotation.json`.

Typical region sequence:

`scene/background -> main character/object -> action/change -> reaction/result`

The annotation may contain `sequence`, `subtitle`, `narrativeRole`, `region`, `startMs`, `durationMs`, `protectedRegions`, and `handPath`.

## Renderer modes

- `inkPath=grid`: faster, robust default.
- `inkPath=skeleton`: follows line structure more closely when line art is clean.
- `colorFill=contour-wipe`: faster default color reveal.
- `colorFill=brush`: brush-like color reveal.

Longer durations / more frames increase rendering time. Keep scene duration driven by SRT timing rather than arbitrary animation length.

## Front-end contract

The browser performs SRT parsing and scene planning locally using `whiteboard/client.ts`.

`POST /render` accepts multipart form data:

- `srt`: required SRT file
- `sceneImages`: one or more completed PNG/JPEG/WebP scene images, ordered by scene
- `annotations`: optional `annotation.json` files, ordered/matched by filename
- `aspectRatio`: `16:9` or `9:16`
- `projectName`: project identifier
- `inkPath`: `grid` or `skeleton`
- `colorFill`: `contour-wipe` or `brush`
- `workflow`: `completed-scene-image`

Success JSON may include `jobId`, `status`, `outputUrl`.

## Environment

Set:

`VITE_WHITEBOARD_RENDERER_URL=https://<our-python-renderer>`

This is our Python/OpenCV renderer endpoint, not an external generative-video model endpoint.

Expected service contract:

- `GET /health` returns HTTP 2xx when renderer is ready.
- `POST /render` uses the multipart contract above.

## Operating rule

Do not rebuild the existing Animation Studio and do not turn Whiteboard into a separate front app. Preserve the current scene/cut/frame editor and add Whiteboard as another rendering path.

Do not request image slicing as the default workflow. One completed image per scene is canonical. Use region annotations to control drawing order while keeping the final canvas visually continuous.

The pinned submodule is the canonical renderer source. Front-end code owns orchestration, scene asset mapping, render options, status, and result links. Python rendering stays isolated so runtime changes do not destabilize the existing animation editor.

## QA state

- Existing `Home.tsx`: preserved
- Whiteboard mode entry: implemented
- SRT parser: implemented
- 25-35 sec scene grouping: implemented
- Completed-image-per-scene input: implemented
- Scene/image count guard: implemented
- Multi `annotation.json` input: implemented
- grid/skeleton selector: implemented
- contour-wipe/brush selector: implemented
- Renderer health check: implemented
- Renderer POST adapter: updated to completed-scene-image contract
- Upstream renderer source: pinned as submodule
- External generative-video API dependency: not required for renderer
- Production Python renderer URL: pending deployment/configuration
- End-to-end MP4 render: pending renderer deployment
