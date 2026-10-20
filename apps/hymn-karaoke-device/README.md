# 노래방 기기 · 찬송가 자막 옵션

O3 **HYMN_TEMPLATE_WORSHIP_V1** 의 자막 선택·QR 바로가기 **기기 웹앱**. 기존 저장소 `8friend8ship-cloud/animation` 하부 앱으로 유지하며 별도 중복 코드 저장소를 생성하지 않습니다.

## 실행

Vercel 프로젝트 루트: `apps/hymn-karaoke-device`. 외부 서버 API 없이 정적 HTML/CSS/JavaScript와 `data/hymns.json`를 제공합니다. 로컬에서는 정적 서버(`python -m http.server 4173`)로 실행하세요.

## 주요 기능

- 찬송가 선택, 한국어·영어 1줄/2줄, 폰트 크기, 음절별 악보 타이밍 색상 표시
- 선택 설정을 URL 쿼리에 넣고 QR·복사·공유로 같은 화면 바로 열기
- 원본 MusicXML에서 확정한 X41 B 첫 10.67초 시간표 재사용 (전5.33/능6.00/하6.67/신7.33/주8.00/님9.33초)
- 미승인 일본어·중국어·스페인어·프랑스어·독일어 옵션은 비활성, 전체곡/새 반주 미제공
- 별도의 미디어 서버 재생 또는 방송 송출, 장치 제어는 아직 연결되지 않음. 노래방 기기 이름은 UI 범위이며 하드웨어 컨트롤러가 아님

## 규칙

Lineage: `DUAL_EYE_MULTI_BRAIN_BRIDGE_V1`; template: `HYMN_TEMPLATE_WORSHIP_V1`; existing contract: `FC-LUMI-HYMN-TAB-FACTORY-V1`. 원본 X41 승인 영상이나 기존 편집함수를 덮어쓰지 말고, 별도 웹앱은 X41 시간표 데이터만 읽습니다. 사용자 승인은 X41 B의 10.67초 화면 싱크만 해당합니다. FFmpeg 시험본의 시각 승인, 전체곡, 다른 언어 가사·배포 권리는 별도 게이트로 유지합니다.

코덱스팩: 기존 `OpenAIPack/CodexPack`은 **노트북 로컬 물리 승인**이 필요한 별도 읽기/수정 기능입니다. GitHub 작업이 코덱스 승인을 대신하거나 권한을 우회한 것으로 기록하지 않습니다.
