# GIF × Code Motion — 학습·프로토타입 검수 (2026-11-07)

**기존 계보**: `DUAL_EYE_MULTI_BRAIN_BRIDGE_V1` → Queens/Seed → 기존 `ANIMATION_PACK` / `VTUBE_PACK` / `VIDEO_PACK`.

**근거 영상**: https://youtu.be/_yWtkaMVbsw (한국어 자막 00:06–13:07 확인). 컷별 영상 화면을 직접 재생해 검수한 단계는 아니므로 `TRANSCRIPT_REVIEWED`로 기록. 영상 제작자의 유료 서비스 비용·모델 우열 주장은 개별 실측 없는 보편 사실로 취급하지 않는다.

## 이번 학습의 차별점

- 00:57–01:46: AI 동영상 전체 재생성 대신 코드로 **몇 초에 어떤 움직임을 적용할지** 지정한다.
- 02:02–03:05: 팔·어깨를 PNG 분리컷 하나로 과도하게 회전시키면 관절이 찢어지거나 목각 인형처럼 보인다. **승인된 스프라이트 프레임** 또는 실제 3D 리깅으로 대체한다.
- 03:22–03:53: 8/12컷 GIF 시트는 영상 속 예시이지 만능 기준이 아니다. 이미지당 ID·방향·의상·포즈를 유지한다.
- 04:42–05:18: 고양이 얼굴과 그릇의 원치 않는 겹침은 동작 전체를 재생성하지 않고 좌표와 접촉 규칙으로 **국소 수정**한다. 본 프로토타입은 2D 축정렬 사각형 겹침만 다루며 실제 3D 물리·회전 충돌을 보장하지 않는다.
- 06:23–09:27: 캐릭터 앞·뒤·좌·우, 의상, 성격 및 공간의 카메라 각도·배치를 **캐릭터 시트/공간 시트**로 고정한다.
- 09:27–12:48: 화면 UI, 대사·자막·음성·BGM까지 타임코드로 조합하고, 장면 파일·제작 로직·QA·실패 원인을 자체 DB에 저장해 재사용한다.

## 기존 앱과 이번 변경 범위

`Home.tsx`에는 **기존 GIF / WebM / MP4 내보내기**가 있다. 이번 브랜치는 이를 중복 작성하거나 프로덕션에 직접 배포하지 않는다.

신규 **모듈만 추가**: `bridge/codeMotionPlanner.ts`

1. 정해진 `sceneId`, FPS, duration, Persona/asset ID와 승인된 PNG 스프라이트시트를 입력받는다.
2. 키프레임의 X·Y·크기·각도·투명도를 결정형으로 보간한다.
3. 시트 8/12장 또는 가변 프레임 수에서 시간대별 프레임 행·열을 결정한다.
4. 명시적으로 지정된 `avoidOverlap` 규칙에 대해서만 최소한의 2D 위치 보정을 수행한다.
5. `drawCodeMotionFrame()`가 이미 로딩된 시트 이미지를 Canvas에 정해진 순서로 그린다. 이후 기존 GIF/MP4 인코더에 전달하도록 **브라우저 어댑터 연결 예정**.

기본 예시:
```ts
import { buildCodeMotionPlan } from '../bridge/codeMotionPlanner';
const plan = buildCodeMotionPlan({
  sceneId: 'cat-bowl-001', width: 300, height: 200, fps: 30, durationMs: 1000,
  actors: [
    { id: 'cat', personaId: 'APPROVED_CAT', width: 30, height: 30,
      sheet: {assetId: 'cat-sheet', columns: 4, rows: 3, frameCount: 12, framesPerSecond: 12},
      keyframes: [{atMs:0,x:0,y:90},{atMs:1000,x:100,y:90,easing:'smoothstep'}] },
    { id:'bowl', width:25, height:30,
      sheet:{assetId:'bowl',columns:1,rows:1,frameCount:1,framesPerSecond:1},
      keyframes:[{atMs:0,x:48,y:90}] }
  ],
  avoidOverlap:[{movingActorId:'cat', obstacleActorId:'bowl', axis:'x',gapPx:3}]
});
```

## 연출·출력 최적화 정책

| 쓰임 | 기본 권장 | 이유 |
|---|---|---|
| 인스타/쇼츠/시온 브이로그 | MP4 9:16 (프로젝트 설정값 확인) | 영상 플랫폼에서 릴스 제작·오디오·재생 효율 |
| 앱 지도/선택 반응/도형 | CSS/SVG 코드 모션, 소형 애니메이션 | 원본 자산 없이 정확한 상태 반응 |
| 미리보기/짧은 반복 소개 | 최적화 GIF 또는 animated WebP | 빠른 미리보기와 호환 목적 |
| 앱의 길거나 큰 반복 애니메이션 | 압축된 MP4/WebM 활용 | 대형 GIF 대비 트래픽·디코딩 비용 절약 |
| 승인된 시온의 정밀 전신·얼굴·손·입술 | 승인된 Blender 수정 3D mesh → UE MetaHuman/리깅 | 2D 스프라이트로 실제 리깅과 동일하다고 주장 금지 |

GIF는 FFmpeg `palettegen/paletteuse` 파이프라인과 파일 크기 QA를 병행할 수 있다. 웹 UI에서는 `prefers-reduced-motion`을 존중하고 자동 모션·큰 파일을 무조건 실행하지 않는다.
관련 공식 자료:
- https://www.remotiondocs.com/docs/render
- https://ffmpeg.org/ffmpeg-filters.html
- https://web.dev/articles/replace-gifs-with-videos
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion

## 캐릭터·공간·움직임 QA 게이트

- `PERSONA_ID` / 승인 정본 `ASSET_ID` 확인. 시온 미승인 얼굴, Unreal 기본 얼굴, 예전 3D mesh 재사용 금지. 실제 Blender 완료 승인 메쉬를 지정하기 전에는 Sion 최종 에셋으로 렌더링 금지.
- Key image: 정면·양측면·후면과 의상 변형, 사진·메쉬·각도 일치 검수.
- 8/12컷은 예시; 실제 느린 동작은 6~12fps 시트 + 24/30fps 코드 보간 영상 출력 등 내용에 맞춰 설정. 모든 프레임 이미지 신규 생성 금지.
- 접촉 제약은 필수 객체에만 적용. 의도적으로 손이 물건을 잡거나 발이 바닥에 닿는 연출은 별도 접촉 프리미티브/3D IK가 필요.
- 검수: 프레임 재생·외곽선·관절 오염·투명 배경·화면 경계·상품/지도/텍스트 표시·오디오와 자막 동기·모바일 메모리·파일 크기·재생 반복 이음새.
- 사용권, 출처, 음악, AI 표기, 캐릭터 공개 승인 별도 QA.
- X2 반복에서 같은 scene JSON → 같은 **픽셀/프레임 계획** 확인. MP4 바이너리 해시는 시간 메타데이터 때문에 단순 비교하지 않음.

## 실행 영수증

- 현재 테스트 범위: 독립 TypeScript compile `--strict` 통과, Node.js 스모크에서 10장 프레임 계획, persona ID 유지, 12컷 시트 위치 전진, 겹침 규칙 수정, 시간 경계, 잘못된 프레임/중복 ID 거부 검증 PASS.
- **미완료**: 실제 사람·동물 스프라이트시트 이미지 생성/연결, 브라우저 `Home.tsx` UI/인코더 통합, Chrome/Galaxy 실제 GIF·MP4 눈검수, CI/배포 및 프로덕션 반영.
- 현재 상태: `RESEARCH_PASS | CODE_PROTOTYPE_PASS | RUNTIME_E2E_PENDING`. main 불변, Draft PR review gate.
- 다음 `FIRST_UNFINISHED`: 이미 승인된 정본 에셋 1개 선정 → 실제 스프라이트/PNG 앵커 검수 → 기능 브랜치에서 Canvas→기존 gif.js / MP4 인코더 연결 → GIF·MP4 각 X2 생성/모바일 QA → 검수 후 main 병합 여부 판단.

## 재사용 데이터 계약 제안

`SOURCE_URL, PROJECT_ID, PERSONA_ID, SCENE_ID, CUT_ID, STYLE_ID, APPROVED_ASSET_IDS, CHARACTER_SHEET_ID, LOCATION_SHEET_ID, SPRITE_COLUMNS, SPRITE_ROWS, FRAME_COUNT, SHEET_FPS, OUTPUT_FPS, MOTION_KEYS, CONTACT_RULES, DURATION_MS, RENDERER, OUTPUT_URI, FILESIZE_BYTES, MOTION_QA, IDENTITY_QA, RIGHTS_QA, LAST_GOOD, FIRST_UNFINISHED, RECEIPT`.

기존 QUEENS→SEED/Animation MotionPrimitive/Asset Registry 시트·GitHub에 연결할 때만 기존 컬럼과 함수 확인 후 확장. 중복 프로젝트·팩·새 트리거·새 유료 API 설치는 수행하지 않는다.
