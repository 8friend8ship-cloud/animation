// O3 existing hymn device · same-browser LOCAL TEST bridge, not remote authorization.
export const schema = "O3_PRESENTATION_LOCAL_V1";
const repoBase = new URL("./", import.meta.url);
export const roomPattern = /^[a-f0-9]{24}$/;
export const allowedScenes = new Set(["nature","hymn","scripture","blank"]);
export const formatTime = cs => {
  const t = Math.floor(Math.max(0,cs)/100);
  return String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0");
};
export const clamp = (x, a, b) => Math.max(a,Math.min(b,x));
export function getRoom() {
  const query = new URLSearchParams(location.search);
  return roomPattern.test(query.get("room")||"") ? query.get("room") : null;
}
export function newRoom() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return [...bytes].map(b => b.toString(16).padStart(2,"0")).join("");
}
export function roomChannel(room) {
  if (!roomPattern.test(room)) throw Error("INVALID_ROOM_ID");
  return new BroadcastChannel("o3-worship-local-only-v1-"+room);
}
export function makeDisplayUrl(room) {
  const link = new URL("./display",repoBase);
  link.searchParams.set("room",room);
  return link.href;
}
export async function loadCatalog() {
  const response = await fetch(new URL("./data/hymns.json",repoBase),{cache:"no-store"});
  if (!response.ok) throw Error("CATALOG_HTTP_"+response.status);
  const doc = await response.json();
  if (doc.schema!=="O3_KARAOKE_SCORE_V1" || !Array.isArray(doc.hymns)) throw Error("CATALOG_INVALID");
  const one = doc.hymns.find(h=>h.id==="nicaea-x41");
  if (!one || one.durationCs!==1067 || !Array.isArray(one.notesCs) ||
    one.notesCs.join(",")!=="0,67,133,200,267,400,533,600,667,733,800,933,1067") {
      throw Error("X41_CANONICAL_CLOCK_UNVERIFIED");
  }
  // Never assume other hymns/languages have cleared lyrics or media rights.
  return doc;
}
export async function loadBiblePilot() {
  const response=await fetch(new URL("./data/bible-1910-pilot.json",repoBase),{cache:"no-store"});
  if(!response.ok) throw Error("BIBLE_SOURCE_HTTP_"+response.status);
  const data=await response.json();
  if(data.schema!=="O3_BIBLE_1910_PILOT_V1"||
     data.sourceZipSHA256!=="FEF4550220AD540B7358472E42DA651B7DCB1475359BDB4D2E388A912AC45E02"||
     data.books.length!==2||data.books[0].verses.length!==31||data.books[1].verses.length!==6)
      throw Error("BIBLE_PUBLIC_DOMAIN_SOURCE_AUDIT_FAILED");
  return data;
}
export function findPilotPassage(data,book,chapter){
  return data?.books?.find(x=>x.id===book&&x.chapter===chapter)||null;
}
export function availableLanguages(catalog,hymn) {
  return catalog.languages.filter(l =>
    l.readiness.startsWith("SYNC_APPROVED") && Array.isArray(hymn.captions[l.code]))
    .map(l=>l.code);
}
export function safeState(input, catalog) {
  if (!input || !allowedScenes.has(input.scene)) return null;
  const approved = catalog.hymns.find(h=>h.id===input.hymnId);
  if (input.scene==="hymn" && !approved) return null;
  const hymn = approved || catalog.hymns[0];
  const valid=availableLanguages(catalog,hymn);
  const primary=valid.includes(input.primary)?input.primary:"ko";
  let secondary=valid.includes(input.secondary)?input.secondary:"en";
  if(secondary===primary) secondary=valid.find(x=>x!==primary)||primary;
  return {
    scene:input.scene,hymnId:hymn.id,
    primary,secondary,lines:input.lines===1?1:2,
    size:["normal","large","extra"].includes(input.size)?input.size:"normal",
    elapsedCs:clamp(Number(input.elapsedCs)||0,0,hymn.durationCs),
    playing:input.playing===true,
    startedEpochMs:Number.isFinite(input.startedEpochMs)?input.startedEpochMs:null,
    seq:Number.isSafeInteger(input.seq)?input.seq:0,
    passageBook:["GEN","PSA"].includes(input.passageBook)?input.passageBook:"GEN",
    passageChapter:Number.isInteger(input.passageChapter)?input.passageChapter:1,
    fromVerse:Number.isInteger(input.fromVerse)?input.fromVerse:1,
    toVerse:Number.isInteger(input.toVerse)?input.toVerse:5,
    currentVerse:Number.isInteger(input.currentVerse)?input.currentVerse:1
  };
}
export function cueAt(hymn,language,elapsedCs) {
  const arr=hymn.captions[language];
  if (!Array.isArray(arr)) return null;
  const cue=arr.find(c=>elapsedCs>=c.startCs&&elapsedCs<c.endCs) ||
    (elapsedCs===hymn.durationCs?arr.at(-1):null);
  if (!cue) return null;
  const fragments=cue.groups;
  const parts=[];
  let soFar=cue.startCs;
  for(const item of fragments) {
    const [text,duration] = item;
    let pct=clamp((elapsedCs-soFar)/duration,0,1);
    parts.push({text,pct});
    soFar+=duration;
  }
  if (soFar!==cue.endCs) throw Error("CUE_DURATION_MISMATCH");
  return parts;
}
export function addCaption(target,hymn,lang,elapsedCs) {
  const wrap=document.createElement("div");
  wrap.className="worship-caption";
  wrap.lang=lang;
  const parts=cueAt(hymn,lang,elapsedCs);
  if(!parts) {wrap.textContent=" ";target.appendChild(wrap);return;}
  for (const {text,pct} of parts) {
    const span=document.createElement("span");
    span.textContent=text;
    span.className="worship-syllable";
    span.style.setProperty("--fill",Math.round(pct*10000)/100+"%");
    wrap.appendChild(span);
  }
  target.appendChild(wrap);
}
