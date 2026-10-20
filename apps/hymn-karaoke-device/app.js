// O3 Hymn Device · X41 score-clock only. Public demo: no music/uncleared lyrics published.
// Uses independent score-anchored time and allows only verified Korean+English test captions.
const $ = (id) => document.getElementById(id);
const permittedSizes = new Set(["small", "normal", "large"]);
let catalog;
let hymn;
let lines = 2;
let size = "normal";
let primary = "ko";
let secondary = "en";
let highlight = true;
let elapsedCs = 0;
let playing = false;
let frameId = 0;
let startedAt = 0;
let startOffset = 0;
const state = { availableLanguages: new Set() };

function formatClock(cs) {
  const whole = Math.floor(Math.max(0, cs) / 100);
  return String(Math.floor(whole / 60)).padStart(2, "0") + ":" + String(whole % 60).padStart(2, "0");
}
function clamp(n, low, high) { return Math.min(high, Math.max(low, n)); }

function getValidOption(value, options, fallback) {
  return options.includes(value) ? value : fallback;
}

function loadDeepLink() {
  const query = new URLSearchParams(location.search);
  const valid = [...state.availableLanguages];
  primary = getValidOption(query.get("primary"), valid, "ko");
  secondary = getValidOption(query.get("secondary"), valid, primary === "ko" ? "en" : "ko");
  if (secondary === primary && valid.length > 1) secondary = valid.find(x => x !== primary) ?? primary;
  lines = query.get("lines") === "1" ? 1 : 2;
  size = permittedSizes.has(query.get("size")) ? query.get("size") : "normal";
  highlight = query.get("highlight") !== "0";
}

function deepLink() {
  const url = new URL(location.href);
  url.search = "";
  url.searchParams.set("mode", "hymn");
  url.searchParams.set("hymn", hymn.id);
  url.searchParams.set("primary", primary);
  url.searchParams.set("secondary", secondary);
  url.searchParams.set("lines", String(lines));
  url.searchParams.set("size", size);
  url.searchParams.set("highlight", highlight ? "1" : "0");
  url.hash = "";
  return url.href;
}
function setDeepLink() {
  const url = deepLink();
  history.replaceState(null, "", url);
  $("directLink").href = url;
  $("directLink").title = url;
  const qr = $("qr");
  qr.replaceChildren();
  if (window.QRCode) {
    new window.QRCode(qr, { text: url, width: 158, height: 158, colorDark: "#0b1932", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.M });
    $("qrFallback").hidden = true;
  } else {
    $("qrFallback").hidden = false;
    qr.textContent = "QR 연결 대기";
  }
}

function cueText(lang, timeCs) {
  const cues = hymn.captions[lang];
  if (!Array.isArray(cues)) return null;
  const cue = cues.find(c => timeCs >= c.startCs && timeCs < c.endCs) ?? (timeCs === hymn.durationCs ? cues.at(-1) : null);
  if (!cue) return null;
  const chars = cue.groups.map(x => x[0]).join("");
  let consumed = 0;
  let passedCs = clamp(timeCs - cue.startCs, 0, cue.endCs - cue.startCs);
  let doneText = "";
  let active = null;
  let pending = "";
  for (const [fragment, duration] of cue.groups) {
    if (passedCs >= consumed + duration) {
      doneText += fragment;
    } else if (passedCs >= consumed && active === null) {
      active = { fragment, progress: clamp((passedCs - consumed) / duration, 0, 1) };
    } else {
      pending += fragment;
    }
    consumed += duration;
  }
  if (!active) active = { fragment: "", progress: 0 };
  return { chars, doneText, active, pending };
}

// Each group is rendered once from the precompiled X41 absolute score clock.
// CSS overlays show progress inside the CURRENT syllable without changing timings.
function renderCaption(lang, order) {
  const container = document.createElement("div");
  container.className = "caption caption-" + size + " caption-" + order;
  container.lang = lang;
  const view = cueText(lang, elapsedCs);
  if (!view) {
    container.classList.add("no-cue");
    container.textContent = " ";
    return container;
  }
  const visual = document.createElement("div");
  visual.className = "caption-visual";
  const regular = document.createElement("span");
  regular.className = "caption-regular";
  regular.textContent = view.chars;
  const filled = document.createElement("span");
  filled.className = "caption-filled";
  filled.setAttribute("aria-hidden", "true");

  // Preserve all glyph widths and spaces by using three exact-string segments.
  const completed = document.createElement("span");
  completed.textContent = view.doneText;
  filled.append(completed);

  const currently = document.createElement("span");
  currently.className = "sweep-fragment";
  currently.textContent = view.active.fragment;
  currently.style.setProperty("--progress", (highlight ? view.active.progress * 100 : 0).toFixed(2) + "%");
  filled.append(currently);

  const future = document.createElement("span");
  future.className = "unfilled-fragment";
  future.textContent = view.pending;
  filled.append(future);
  visual.append(regular, filled);
  container.append(visual);
  return container;
}

function draw() {
  const area = $("lyrics");
  const chosen = lines === 2 && primary !== secondary ? [primary, secondary] : [primary];
  const result = document.createDocumentFragment();
  chosen.forEach((lang, i) => result.appendChild(renderCaption(lang, i === 0 ? "primary" : "secondary")));
  area.replaceChildren(result);
  $("seek").value = String(Math.round(elapsedCs));
  $("timeReadout").textContent = formatClock(elapsedCs);
  $("clockText").textContent = formatClock(elapsedCs) + " / " + formatClock(hymn.durationCs);
}
function pause() {
  playing = false;
  cancelAnimationFrame(frameId);
  $("playBtn").textContent = "▶ 자막 시연";
}
function tick(timestamp) {
  if (!playing) return;
  if (!startedAt) startedAt = timestamp;
  elapsedCs = clamp(startOffset + (timestamp - startedAt) / 10, 0, hymn.durationCs);
  draw();
  if (elapsedCs >= hymn.durationCs) {
    pause();
    return;
  }
  frameId = requestAnimationFrame(tick);
}
function playbackToggle() {
  if (playing) { pause(); return; }
  if (elapsedCs >= hymn.durationCs) elapsedCs = 0;
  startOffset = elapsedCs;
  startedAt = 0;
  playing = true;
  $("playBtn").textContent = "Ⅱ 일시정지";
  frameId = requestAnimationFrame(tick);
}
function chooseButtons(selector, field, value) {
  document.querySelectorAll(selector).forEach(b => b.classList.toggle("active", b.dataset[field] === value));
}
function updateForm() {
  $("primaryLang").value = primary;
  $("secondaryLang").value = secondary;
  $("secondaryControl").hidden = lines !== 2;
  $("highlightToggle").checked = highlight;
  chooseButtons("[data-lines]", "lines", String(lines));
  chooseButtons("[data-size]", "size", size);
  $("languageStatus").textContent = "한국어·영어 첫 10.67초 싱크 승인. 일본어·중국어·스페인어 등은 가사 검증 후 활성화됩니다.";
}
function refresh() {
  updateForm();
  draw();
  setDeepLink();
}
function setup() {
  $("hymnTitle").textContent = hymn.title;
  $("hymnSelect").replaceChildren(new Option(hymn.numberKo + " · " + hymn.title, hymn.id));
  for (const lang of catalog.languages) {
    // Do not allow choosing languages with unverified text.
    const usable = state.availableLanguages.has(lang.code);
    const label = lang.name + (usable ? "" : " · 준비 중");
    $("primaryLang").appendChild(new Option(label, lang.code, false, false));
    $("secondaryLang").appendChild(new Option(label, lang.code, false, false));
    for (const select of [$("primaryLang"), $("secondaryLang")]) {
      const option = [...select.options].find(x => x.value === lang.code);
      if (option) option.disabled = !usable;
    }
  }

  for (const b of document.querySelectorAll("[data-lines]")) {
    b.addEventListener("click", () => { lines = Number(b.dataset.lines); refresh(); });
  }
  for (const b of document.querySelectorAll("[data-size]")) {
    b.addEventListener("click", () => { size = b.dataset.size; refresh(); });
  }
  $("primaryLang").addEventListener("change", (event) => {
    primary = getValidOption(event.target.value, [...state.availableLanguages], primary);
    if (primary === secondary) secondary = primary === "ko" ? "en" : "ko";
    refresh();
  });
  $("secondaryLang").addEventListener("change", (event) => {
    secondary = getValidOption(event.target.value, [...state.availableLanguages], secondary);
    if (secondary === primary) primary = secondary === "ko" ? "en" : "ko";
    refresh();
  });
  $("highlightToggle").addEventListener("change", (e) => { highlight = e.target.checked; refresh(); });
  $("playBtn").addEventListener("click", playbackToggle);
  $("restartBtn").addEventListener("click", () => { pause(); elapsedCs = 0; draw(); });
  $("seek").max = String(hymn.durationCs);
  $("seek").addEventListener("input", (e) => {
    pause();
    elapsedCs = clamp(Number(e.target.value), 0, hymn.durationCs);
    draw();
  });
  $("fullscreenBtn").addEventListener("click", async () => {
    const element = $("stage");
    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
    } else {
      await element.requestFullscreen?.();
    }
  });
  $("homeTab").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  $("hymnTab").addEventListener("click", () => $("stage").scrollIntoView({ behavior: "smooth" }));
  $("captionsTab").addEventListener("click", () => $("settings").scrollIntoView({ behavior: "smooth" }));
  $("copyLinkBtn").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(deepLink()); $("copyNotice").textContent = "주소를 복사했습니다."; }
    catch { $("copyNotice").textContent = "복사가 제한됐습니다. 아래 바로가기 주소를 이용하세요."; }
  });
  $("shareBtn").addEventListener("click", async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "찬송가 자막", url: deepLink() }); } catch { /* user dismissed */ }
    } else {
      $("copyLinkBtn").click();
    }
  });
  refresh();
}
async function main() {
  try {
    const response = await fetch("./data/hymns.json", { cache: "no-store" });
    if (!response.ok) throw Error("Hymn catalog unavailable: " + response.status);
    catalog = await response.json();
    if (catalog.schema !== "O3_KARAOKE_SCORE_V1" || !Array.isArray(catalog.hymns)) throw Error("Unexpected hymn data");
    hymn = catalog.hymns.find(x => x.id === "nicaea-x41");
    if (!hymn) throw Error("X41 approved demo not found");
    for (const language of catalog.languages) {
      if (Array.isArray(hymn.captions[language.code]) && language.readiness.startsWith("SYNC_APPROVED")) {
        state.availableLanguages.add(language.code);
      }
    }
    if (!state.availableLanguages.has("ko") || !state.availableLanguages.has("en")) throw Error("Two verified languages required");
    loadDeepLink();
    setup();
  } catch (err) {
    console.error(err);
    $("lyrics").textContent = "검증된 찬송가 데이터를 읽지 못했습니다.";
    $("playBtn").disabled = true;
    $("languageStatus").textContent = "데이터 연결 실패. 새로고침해 주세요.";
  }
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
else main();
