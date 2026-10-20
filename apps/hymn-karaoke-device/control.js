import {schema,getRoom,newRoom,makeDisplayUrl,roomChannel,loadCatalog,loadBiblePilot,findPilotPassage,formatTime,clamp} from "./presentation-shared.js";
const $=id=>document.getElementById(id);
const room=getRoom()||newRoom();
if (!getRoom()) {
 const url=new URL(location.href);
 url.searchParams.set("room",room);
 history.replaceState(null,"",url);
}
const channel=roomChannel(room);
let catalog=null;
let bible=null;
let passage=null;
let currentHymn=null;
let preview="nature";
let active="nature";
let startMs=null;
let elapsedCs=0;
let playing=false;
let seq=0;
let acknowledgedAt=0;
let lastClock=0;
let first="ko";
let second="en";
let font="normal";
let number=8;
const duration=()=>currentHymn?.durationCs||1067;
const withSeq=()=>({scene:active,seq,hymnId:currentHymn?.id||"nicaea-x41",
  primary:first,secondary:second==="none"?first:second,lines:second==="none"?1:2,
  size:font,elapsedCs:Math.round(elapsedCs),playing,startedEpochMs:startMs,
  passageBook:passage?.book||"GEN",passageChapter:passage?.chapter||1,
  fromVerse:passage?.from||1,toVerse:passage?.to||5,currentVerse:passage?.current||1});
function send() {
  channel.postMessage({v:1,kind:"STATE",room,state:withSeq()});
}
function bump() {seq++;send();}
function syncClock() {
 if (playing && startMs!==null) {
   elapsedCs=clamp((Date.now()-startMs)/10,0,duration());
   if(elapsedCs>=duration()) {playing=false;startMs=null;bump();}
   $("seek").value=Math.round(elapsedCs);
 }
 $("timeLabel").textContent=formatTime(elapsedCs)+" / "+formatTime(duration());
}
function status() {
 const connected=Date.now()-acknowledgedAt<13000;
 $("connectionStatus").textContent=connected?"같은 브라우저 모니터 연결됨":"같은 브라우저 모니터 연결 대기";
 $("connectionLed").classList.toggle("connected",connected);
}
channel.onmessage=(e)=>{
 const msg=e.data;
 if (!msg||msg.v!==1||msg.room!==room) return;
 if (msg.kind==="HELLO") send();
 if (msg.kind==="DISPLAY_NEXT" && active==="scripture" && msg.seq===seq) turnVerse(1);
 if (msg.kind==="ACK") {acknowledgedAt=Date.now();status();}
};
function setPreview(scene) {
 preview=scene;
 $("nextPreview").textContent=scene==="hymn"?"8장 거룩 거룩 거룩 · 첫 10.67초":
  scene==="scripture"&&passage?passage.name+" "+passage.chapter+"장 "+passage.from+"–"+passage.to+"절":
  scene==="blank"?"검은 화면":"자연풍경 대기";
 $("goLive").disabled=(scene==="hymn"&&!currentHymn)||(scene==="scripture"&&!passage);
}
function goLive() {
 active=preview;
 playing=false;
 startMs=null;
 elapsedCs=0;
 $("livePreview").textContent="실제 모니터: "+$("nextPreview").textContent;
 bump();
 syncClock();
}
function play() {
 if(active!=="hymn") { $("selectedInfo").textContent="먼저 찬송가를 선택하고 화면에 송출하세요.";return;}
 if(elapsedCs>=duration())elapsedCs=0;
 startMs=Date.now()-elapsedCs*10;
 playing=true;
 bump();
}
function pause() {
 syncClock();
 playing=false;startMs=null;bump();
}
function restart() {
 elapsedCs=0;
 if(playing)startMs=Date.now();
 bump();
 syncClock();
}
function selectNumber() {
 const val=Number($("hymnNumber").value);
 if(!Number.isInteger(val)||val<1||val>645){
  $("selectedInfo").textContent="1~645 사이의 찬송가 번호를 입력하세요.";
  return;
 }
 const selected=catalog?.hymns.find(h=>parseInt(h.numberKo,10)===val);
 if(!selected){
  $("selectedInfo").textContent=val+"장은 아직 가사·영상 검수 및 사용 승인이 없어 표시할 수 없습니다.";
  return;
 }
 number=val;currentHymn=selected;
 $("selectedInfo").textContent="8장 선택 · X41 첫 10.67초 자막 시연 가능 (반주 미연결)";
 setPreview("hymn");
}
function chooseScripture(){
 if(!bible){$("scriptureStatus").textContent="성경 원본을 아직 불러오지 못했습니다.";return;}
 const book=$("bookSelect").value,chapter=Number($("chapterNumber").value);
 const from=Number($("fromVerse").value),to=Number($("toVerse").value);
 const data=findPilotPassage(bible,book,chapter);
 if(!data||!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from||to>data.verses.length){
   $("scriptureStatus").textContent="현재 가능한 장절: 창세기 1장 1–31절, 시편 23편 1–6절입니다.";
   return;
 }
 passage={book,chapter,name:data.name,from,to,current:from};
 $("scriptureStatus").textContent=data.name+" "+chapter+"장 "+from+"–"+to+"절 · 1910년 성경";
 setPreview("scripture");
}
function turnVerse(delta){
 if(active!=="scripture"||!passage){$("scriptureStatus").textContent="먼저 말씀을 화면에 송출해 주세요.";return;}
 passage.current=clamp(passage.current+delta,passage.from,passage.to);
 $("scriptureStatus").textContent=passage.name+" "+passage.chapter+"장 "+passage.current+"절";
 bump();
}
function makeQRCode() {
 const href=makeDisplayUrl(room);
 $("openDisplay").href=href;
 $("openDisplay").rel="noopener";
 $("roomQr").replaceChildren();
 if(window.QRCode) {
   new window.QRCode($("roomQr"),{text:href,width:164,height:164,colorDark:"#132a48",colorLight:"#fff",correctLevel:window.QRCode.CorrectLevel.M});
 } else {
   $("roomQr").textContent="QR 생성 지연 · 모니터 주소 복사 가능";
 }
}
function wire() {
 $("hymnNumber").value="8";
 $("numEnter").addEventListener("click",selectNumber);
 $("numClear").addEventListener("click",()=>{$("hymnNumber").value=$("hymnNumber").value.slice(0,-1);});
 $("hymnNumber").addEventListener("keydown",e=>{if(e.key==="Enter")selectNumber();});
 for(const button of document.querySelectorAll("[data-digit]")){
   button.addEventListener("click",()=>{$("hymnNumber").value=($("hymnNumber").value+button.dataset.digit).slice(0,3);});
 }
 $("previewHymn").addEventListener("click",()=>{selectNumber();});
 $("previewNature").addEventListener("click",()=>setPreview("nature"));
 $("previewBlank").addEventListener("click",()=>setPreview("blank"));
 $("previewScripture").addEventListener("click",chooseScripture);
 $("previousVerse").addEventListener("click",()=>turnVerse(-1));
 $("nextVerse").addEventListener("click",()=>turnVerse(1));
 $("bookSelect").addEventListener("change",()=>{
  const isPsalm=$("bookSelect").value==="PSA";
  $("chapterNumber").value=isPsalm?"23":"1";
  $("fromVerse").value="1";
  $("toVerse").value=isPsalm?"6":"5";
 });
 $("goLive").addEventListener("click",goLive);
 $("play").addEventListener("click",play);
 $("pause").addEventListener("click",pause);
 $("restart").addEventListener("click",restart);
 $("seek").max=String(duration());
 $("seek").addEventListener("input",e=>{
   elapsedCs=clamp(Number(e.target.value),0,duration());
   if(playing)startMs=Date.now()-elapsedCs*10;
   bump();syncClock();
 });
 const sendOptions=()=>{
   first=$("firstLang").value;second=$("secondLang").value;font=$("fontSize").value;
   if(second===first)second="none";
   if(active==="hymn")bump();
 };
 for(const id of ["firstLang","secondLang","fontSize"])
   $(id).addEventListener("change",sendOptions);
 $("copyDisplay").addEventListener("click",async()=>{
   try{await navigator.clipboard.writeText(makeDisplayUrl(room));$("copyStatus").textContent="모니터 주소가 복사됐습니다.";}
   catch{$("copyStatus").textContent=makeDisplayUrl(room);}
 });
 $("openDisplay").addEventListener("click",()=>setTimeout(send,600));
}
async function init(){
 try{
   catalog=await loadCatalog();
   try{bible=await loadBiblePilot();}catch(e){console.warn("BIBLE_PILOT_HOLD",e);}
   currentHymn=catalog.hymns[0];
   wire();
   setPreview("nature");makeQRCode();syncClock();status();
   send();
   setInterval(()=>{syncClock();if(playing||Date.now()-lastClock>3500){lastClock=Date.now();send();}status();},400);
 }catch(error){
   $("connectionStatus").textContent="악보 데이터 불러오기 실패";
   $("selectedInfo").textContent="화면을 사용하기 전에 검증된 원본이 필요합니다.";
   $("goLive").disabled=true;
   console.error(error);
 }
}
init();
window.addEventListener("pagehide",()=>channel.close());
