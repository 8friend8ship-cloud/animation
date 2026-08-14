# Whiteboard Renderer Integration

Date: 2026-08-15
Status: FRONT_INTEGRATED / RENDER_SERVICE_URL_REQUIRED

## Source

- Upstream: `geeklee/srt-whiteboard-animation`
- Pinned commit: `696a7243c0e6ffb6827676e539c2ca5ebae2bf6b`
- License: MIT
- Imported as Git submodule: `vendor/srt-whiteboard-animation`

## Animation Studio integration

The existing Animation Studio remains the primary front app. Whiteboard is added as a renderer mode instead of creating another front app.

Entry flow:

`index.tsx -> App.tsx -> Home | WhiteboardWorkspace`

The existing Home component is preserved. A `Whiteboard` launcher is added by `App.tsx`. The whiteboard workspace can also be opened with `?mode=whiteboard`.

## Whiteboard workflow

`SRT -> local parse -> 25-35 sec scene grouping -> optional line-art input -> WHITEBOARD_RENDERER /render -> MP4 URL`

The browser performs SRT parsing and scene planning locally using `whiteboard/client.ts`. Heavy MP4 drawing/rendering stays outside the browser and is delegated to the Python renderer service.

## Environment

Set:

`VITE_WHITEBOARD_RENDERER_URL=https://<renderer-service>`

Expected service contract:

- `GET /health` returns HTTP 2xx when renderer is ready.
- `POST /render` accepts multipart form data:
  - `srt`: required SRT file
  - `lineArt`: optional PNG/JPEG/WebP
  - `aspectRatio`: `16:9` or `9:16`
  - `projectName`: project identifier
- Success JSON may include `jobId`, `status`, `outputUrl`.

## Operating rule

Do not duplicate the upstream source into the front-end bundle. The pinned submodule is the canonical renderer source. Front-end code only owns orchestration, preview, request state, and result links. Python rendering stays isolated so provider/runtime changes do not destabilize the existing animation editor.

## QA state

- Existing `Home.tsx`: preserved
- Whiteboard mode entry: implemented
- SRT parser: implemented
- Scene grouping: implemented
- Renderer health check: implemented
- Renderer POST adapter: implemented
- Upstream renderer source: pinned as submodule
- Production renderer URL: pending deployment/configuration
- End-to-end MP4 render: pending renderer deployment
