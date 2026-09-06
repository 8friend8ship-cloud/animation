import type { H264MP4Encoder } from 'h264-mp4-encoder';
import h264EncoderWebUrl from 'h264-mp4-encoder/embuild/dist/h264-mp4-encoder.web.js?url';

type HmeBrowserGlobal = {
  createH264MP4Encoder?: () => Promise<H264MP4Encoder>;
};

declare global {
  interface Window {
    HME?: HmeBrowserGlobal;
  }
}

const SCRIPT_SELECTOR = 'script[data-h264-browser-encoder="true"]';
const LOAD_TIMEOUT_MS = 10000;
let loadPromise: Promise<void> | null = null;

function removeStaleScript() {
  document.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR)?.remove();
}

function loadBrowserEncoderScript(): Promise<void> {
  if (window.HME?.createH264MP4Encoder) return Promise.resolve();
  if (loadPromise) return loadPromise;

  removeStaleScript();
  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    let settled = false;

    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) {
        removeStaleScript();
        reject(err);
      } else {
        resolve();
      }
    };

    const verify = () => {
      if (window.HME?.createH264MP4Encoder) finish();
      else finish(new Error('H264 browser encoder loaded without createH264MP4Encoder'));
    };

    const timer = window.setTimeout(() => {
      finish(new Error(`H264 browser encoder load timed out after ${LOAD_TIMEOUT_MS}ms`));
    }, LOAD_TIMEOUT_MS);

    script.src = h264EncoderWebUrl;
    script.async = true;
    script.dataset.h264BrowserEncoder = 'true';
    script.addEventListener('load', verify, { once: true });
    script.addEventListener('error', () => finish(new Error('H264 browser encoder script failed to load')), { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    loadPromise = null;
    throw error;
  });

  return loadPromise;
}

export async function createBrowserH264MP4Encoder(): Promise<H264MP4Encoder> {
  await loadBrowserEncoderScript();
  const factory = window.HME?.createH264MP4Encoder;
  if (!factory) {
    loadPromise = null;
    removeStaleScript();
    throw new Error('H264 browser encoder factory is unavailable');
  }
  return factory();
}
