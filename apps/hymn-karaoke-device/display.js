import {schema,getRoom,roomChannel,loadCatalog,loadBiblePilot,findPilotPassage,safeState,clamp,addCaption} from "./presentation-shared.js";
const $=id=>document.getElementById(id);
const room=getRoom();
let channel=null, catalog=null,bible=null;
let live=null,lastSeq=-1,lastMessageAt=0,raf=0, connected=false;
function showNature(){
 $("worshipScreen").className="worship-screen nature-scene";
 $("projectedContent").hidden=true;
 $("scripturePanel").hidden=true;
 $("standbyLabel").hidden=false;
}
function showBlank(){
 $("worshipScreen").className="worship-screen blank-scene";
 $("projectedContent").hidden=true;
 $("scripturePanel").hidden=true;
 $("standbyLabel").hidden=true;
}
function showHymn(){
 $("worshipScreen").className="worship-screen hymn-scene";
 $("standbyLabel").hidden=true;
 $("scripturePanel").hidden=true;
 $("projectedContent").hidden=false;
}
function showScripture(){
 $("worshipScreen").className="worship-screen scripture-scene";
 $("standbyLabel").hidden=true;
 $("projectedContent").hidden=true;
 $("scripturePanel").hidden=false;
}
function updateScene(){
 if(!catalog||!live){showNature();return;}
 if(live.scene==="nature"){showNature();return;}
 if(live.scene==="blank"){showBlank();return;}
 if(live.scene==="scripture"){
   const entry=findPilotPassage(bible,live.passageBook,live.passageChapter);
   if(!entry||live.fromVerse<1||live.toVerse>entry.verses.length||
      live.toVerse<live.fromVerse||live.currentVerse<live.fromVerse||live.currentVerse>live.toVerse){
     showNature();return;
   }
   const verse=entry.verses.find(x=>x.v===live.currentVerse);
   if(!verse){showNature();return;}
   showScripture();
   $("scriptureReference").textContent=entry.name+" "+entry.chapter+"장 "+verse.v+"절";
   $("scriptureVerse").textContent=verse.text;
   $("scriptureProgress").textContent=verse.v+" / "+live.toVerse+"절";
   // Fit text within measured monitor bounds; preserve complete wording and punctuation.
   const element=$("scriptureVerse");
   let font=clamp(window.innerWidth*.043,36,84);
   element.style.fontSize=font+"px";
   for(let i=0;i<16 && element.scrollHeight>element.clientHeight+2;i++){
     font=Math.max(25,font-4);
     element.style.fontSize=font+"px";
   }
   return;
 }
 const hymn=catalog.hymns.find(h=>h.id===live.hymnId);
 if(!hymn){showNature();return;}
 showHymn();
 $("projectedKicker").textContent="찬송가 "+hymn.numberKo+" · X41 시연";
 $("projectedTitle").textContent=hymn.title;
 const target=$("projectedLyrics");
 target.replaceChildren();
 target.dataset.size=live.size;
 const now=live.playing&&live.startedEpochMs
   ?clamp((Date.now()-live.startedEpochMs)/10,0,hymn.durationCs)
   :live.elapsedCs;
 const langs=live.lines===2&&live.primary!==live.secondary
  ?[live.primary,live.secondary]:[live.primary];
 for (const language of langs) addCaption(target,hymn,language,now);
 $("projectedNote").textContent="첫 10.67초 악보 자막 시연 · 실제 반주 미연결";
}
function frame(){
 updateScene();
 // Keep all animated scene timing deterministic from the clock (no audio chasing).
 raf=requestAnimationFrame(frame);
}
function accept(msg){
 if(!msg||msg.v!==1||msg.room!==room||msg.kind!=="STATE")return;
 const valid=safeState(msg.state,catalog);
 if(!valid||valid.seq<lastSeq)return;
 if(valid.seq===lastSeq){
   lastMessageAt=Date.now();
   channel.postMessage({v:1,kind:"ACK",room,seq:lastSeq});
   return;
 }
 lastSeq=valid.seq;
 live=valid;
 connected=true;lastMessageAt=Date.now();
 $("localConnectionLabel").hidden=true;
 channel.postMessage({v:1,kind:"ACK",room,seq:lastSeq});
 updateScene();
}
async function boot(){
 if(!room) {
   $("localConnectionLabel").textContent="모니터 연결 주소가 없습니다";
   showNature();return;
 }
 try{
  catalog=await loadCatalog();
  try{bible=await loadBiblePilot();}catch(e){console.warn("BIBLE_PILOT_HOLD",e);}
  channel=roomChannel(room);
  channel.onmessage=e=>accept(e.data);
  $("scripturePanel").addEventListener("click",()=>{
    if(live?.scene==="scripture")channel.postMessage({v:1,kind:"DISPLAY_NEXT",room,seq:lastSeq});
  });
  channel.postMessage({v:1,kind:"HELLO",room});
  showNature();
  raf=requestAnimationFrame(frame);
  setInterval(()=>{
   // No background takeover if a LIVE slide loses network; hold last verified slide.
   if(!connected)channel.postMessage({v:1,kind:"HELLO",room});
   else if(Date.now()-lastMessageAt>15000){
     channel.postMessage({v:1,kind:"HELLO",room});
     // Connection label only for diagnostics; never reveal controls on audience screen.
     $("localConnectionLabel").hidden=true;
   }
  },4000);
 }catch(e){
   console.error(e);
   showNature();
   $("localConnectionLabel").textContent="자연 배경 대기";
 }
}
boot();
window.addEventListener("pagehide",()=>{cancelAnimationFrame(raf);channel?.close();});
