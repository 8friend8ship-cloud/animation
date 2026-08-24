# OpenAI Project Control

- Repository: `8friend8ship-cloud/animation`
- Actual package: `gemini-animation-studio`
- Project role: **이미지 시퀀스를 GIF·MP4·ZIP으로 만드는 미디어 렌더링 엔진**
- Management status: `ACTIVE_MEDIA_ENGINE`
- Last reviewed: `2026-08-24 KST`

## 1. 활용 방향

이 저장소는 글을 만드는 곳이 아니라, ClipStream·Flow·DRYWRITE에서 전달된 장면 자료를 실제 미디어 파일로 조합·인코딩하는 제작 도구로 사용한다.

주요 산출물:
- 장면 이미지 묶음
- GIF 미리보기
- H.264 MP4
- ZIP 원본 묶음
- 플랫폼 업로드용 최종 미디어

## 2. 상호 연계

- 상위 원문/장면: `DRYWRITE`, `-`(ClipStream), Flow 작업 결과
- 품질/성과 분석: `Analyzer-12.09`
- 결과 저장: `MEDIA_OUTPUT`
- 후속 편집: NotebookLM 또는 결정형 Python 편집
- 송출: 플랫폼 발행 에이전트

## 3. Drive 연계 정책

- `MASTER_REGISTRY`
- `FLOW_TASK_QUEUE`
- `MEDIA_INPUT`
- `MEDIA_OUTPUT`
- `NOTEBOOKLM_TASK_QUEUE`
- `PUBLISH_AGENT`

Drive URL·ID는 공개 저장소에 넣지 않고 중앙 운영대장에서 별칭으로 관리한다.

## 4. 파일 꼬리표

- `[MEDIA]`: 이미지·GIF·영상
- `[ENCODER]`: MP4/GIF 인코딩
- `[STORAGE]`: IndexedDB·임시 저장
- `[FRONTEND]`: 장면 선택·미리보기
- `[AI]`: Gemini 이미지/장면 기능
- `[DRIVE]`: 입력·출력 파일 연계
- `[INTEGRATION]`: ClipStream/Flow/NotebookLM 연결
- `[PERFORMANCE]`: 메모리·대용량 파일
- `[SECRET]`: 키 점검
- `[DEPLOY]`: 브라우저/Vite 배포

## 5. 초기 파일 대장

| 파일/영역 | 태그 | 활용 방향 | 상태 | 다음 점검 |
|---|---|---|---|---|
| `package.json` | `[ENCODER] [DEPLOY]` | GIF·H264 MP4·ZIP 의존성 관리 | 확인됨 | 브라우저 호환·용량 확인 |
| IndexedDB 영역 | `[STORAGE] [MEDIA]` | 로컬 미디어 임시 저장 | 검토 예정 | 삭제 정책·저장 한도·복구 확인 |
| MP4 encoder 영역 | `[ENCODER] [PERFORMANCE]` | 영상 파일 생성 | 검토 예정 | 모바일 메모리·코덱·진행률 확인 |
| GIF/ZIP 영역 | `[ENCODER] [MEDIA]` | 미리보기·원본 묶음 | 검토 예정 | 해상도·파일명·압축 규칙 확인 |
| Gemini 기능 | `[AI] [SECRET]` | 장면/이미지 생성 보조 | 우선 검토 | API 비용과 키 노출 점검 |
| 내보내기 | `[DRIVE] [INTEGRATION]` | Drive/NotebookLM/플랫폼 전달 | 검토 예정 | CONTENT_ID·SCENE_ID 보존 확인 |

## 6. 수정 진행 규칙

1. 미디어 생성 전 원본 `CONTENT_ID`와 `SCENE_ID`를 유지한다.
2. Flow는 장면 이미지 생산, 이 저장소는 렌더링·인코딩 역할로 분리한다.
3. NotebookLM은 원문·이미지·음원을 모은 후속 편집 단계로 둔다.
4. 대용량 파일은 GitHub에 커밋하지 않고 Drive `MEDIA_OUTPUT`에 저장한다.
5. 코드 변경은 작업 브랜치와 Draft PR로 진행한다.
6. 모바일 브라우저 메모리와 실패 복구를 항상 테스트한다.
7. Flow/BRG_002가 검증 전이거나 연결 불가일 때는 **기존 scene-pack / 기존 이미지 에셋 → SHORTS/kinetic renderer → Animation Studio → MP4** 순서의 결정형 우회경로를 사용한다.
8. 우회경로에서도 `CONTENT_ID`, `SCENE_ID`, `STYLE_ID`, `ASSET_ID` 계보를 유지하여 Flow가 복구되면 생성 컷만 교체할 수 있게 한다.
9. 신규 유료 생성은 승인 경계를 유지하고, 우회경로는 기존 에셋 재사용을 우선한다.

## 7. 결정 기록

- `2026-07-30`: animation을 프로젝트 공통 미디어 렌더링 엔진으로 지정함.
- `2026-08-24`: Flow BRG_002는 노트북에서 별도 검증·개선하기로 하고, 샘플 쇼츠 제작은 결정형 우회경로(scene-pack/assets → SHORTS/kinetic → Animation Studio → MP4)로 즉시 진행하도록 확정.
