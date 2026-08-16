export type ReuseStyleId = 'whiteboard' | 'motion-comic' | 'flow-cinematic' | 'kinetic-text' | 'photo-parallax' | 'hybrid';

export type ReuseStyle = {
  id: ReuseStyleId;
  name: string;
  summary: string;
  mix: string;
  bestFor: string;
};

export const DRYWRITER_REUSE_STYLES: ReuseStyle[] = [
  {id:'whiteboard', name:'1. Whiteboard 설명형', summary:'손이 선을 그리고 색을 채우며 음성·자막을 따라가는 저비용 설명형.', mix:'Whiteboard 90% + zoom/pan 10%', bestFor:'묵상·교육·개념 설명'},
  {id:'motion-comic', name:'2. 모션 코믹', summary:'컷툰처럼 장면을 나누고 표정·말풍선·카메라 이동으로 리듬을 만든다.', mix:'Still cut 70% + 2D motion 30%', bestFor:'건조한작가 상황·대화·갈등'},
  {id:'flow-cinematic', name:'3. Flow 시네마틱', summary:'핵심 전환 장면만 Flow 이미지/영상 생성으로 강조한다.', mix:'Flow 35% + still/whiteboard 65%', bestFor:'후킹 장면·감정 전환'},
  {id:'kinetic-text', name:'4. 키네틱 타이포', summary:'짧은 문장·숫자·질문을 큰 자막과 그래픽으로 빠르게 전개한다.', mix:'Typography 70% + icons 30%', bestFor:'Shorts/Reels 정보 밀도'},
  {id:'photo-parallax', name:'5. 포토 패럴랙스', summary:'완성 이미지에 깊이·줌·패닝을 주고 음성과 자막으로 다큐처럼 전개한다.', mix:'Photo 80% + parallax 20%', bestFor:'감성 에세이·오디오북'},
  {id:'hybrid', name:'6. Hybrid 2분 쇼츠', summary:'화이트보드·일반 애니메이션·Flow 생성 컷을 한 타임라인에서 혼합한다.', mix:'Whiteboard 45% + 2D animation 30% + Flow 25%', bestFor:'대표 실전 테스트'}
];

export const HYBRID_120S_TIMELINE = [
  {start:0,end:18,mode:'whiteboard',label:'식탁·침묵·사랑해 후킹'},
  {start:18,end:34,mode:'motion-comic',label:'상대 질문과 주인공 반응'},
  {start:34,end:52,mode:'whiteboard',label:'감정 부채·숫자 시각화'},
  {start:52,end:70,mode:'flow-cinematic',label:'관계 온도 하락 상징 장면'},
  {start:70,end:89,mode:'motion-comic',label:'침묵 선택·갈등'},
  {start:89,end:108,mode:'whiteboard',label:'사랑=숙제 메타포 정리'},
  {start:108,end:120,mode:'flow-cinematic',label:'마지막 질문·여운'}
] as const;
