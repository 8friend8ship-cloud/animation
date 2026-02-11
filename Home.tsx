/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React, {ChangeEvent, useEffect, useRef, useState, useCallback} from 'react';
import {GoogleGenAI, Modality, Type} from '@google/genai';
import GIF from 'gif.js';
import JSZip from 'jszip';
import {
  ArrowLeft,
  Bot,
  Brush,
  Download,
  Eraser,
  Feather,
  FileText,
  Film,
  Grid3X3,
  Hand,
  ImageUp,
  Laugh,
  LoaderCircle,
  Music2,
  Palette,
  Pause,
  PenTool,
  PersonStanding,
  Play,
  Plus,
  RectangleHorizontal,
  RectangleVertical,
  RotateCcw,
  SendHorizontal,
  Settings2,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
  Clapperboard,
  Droplet,
  Cuboid,
  Paintbrush,
  Camera,
  RadioTower,
  PaintBucket,
  GalleryThumbnails,
} from 'lucide-react';

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

const BLUE_TIE_BASE_IMAGE_DATA_URL = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NjAiIGhlaWdodD0iNTQwIiB2aWV3Qm94PSIwIDAgOTYwIDU0MCI+CiAgPHJlY3Qgd2lkdGg9Ijk2MCIgaGVpZGhodD0iNTQwIiIGZpbGw9Im5vbmUiLz4KICA8ZyBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMTAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CiAgICA8cGF0aCBkPSJNNDgwIDMzMHYxMDAiIGZpbGw9Im5vbmUiLz4KICAgIDxwYXRoIGQ9Im00MjAgMzgwIDYwLTMwIDYwIDMwIiBmaWxsPSJub25lIi8+CiAgICA8cGF0aCBkPSJtNDQwIDQ4MCA0MC01MCA0MCA1MCINCiAgICAgIGZpbGw9Im5vbmUiLz4KICAgIDxjaXJjbGUgY3g9IjQ4MCIgY3k9IjI1MCIgcj0iODAiIGZpbGw9IiM0Mjg1ZjQiLz4KICAgIDxwYXRoIGQ9Im00ODAgMzMwLTIwIDIwIDIwIDQwIDIwLTQwLTIwLTIweiIgZmlsbD0iI2RiNDQzNyIgc3Ryb2tlLXdpZHRoPSI1Ii8+CiAgPC9nPgo8L3N2Zz4=';
const RED_TIE_TEDDY_BASE_IMAGE_DATA_URL = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NjAiIGhlaWdodD0iNTQwIiB2aWV3Qm94PSIwIDAgOTYwIDU0MCI+CiAgPHJlY3Qgd2lkdGg9Ijk2MCIgaGVpZ2h0PSI1NDAiIGZpbGw9Im5vbmUiLz4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0ODAgMjcwKSBzY2FsZSgxLjUpIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj4KICAgIDxnIGZpbGw9IiM4ZDZlNjMiPgogICAgICA8Y2lyY2xlIGN4PSIwIiBjeT0iLTMwIiByPSI3MCIvPgogICAgICA8Y2lyY2xlIGN4PSItNjAiIGN5PSItODAiIHI9IjI1Ii8+CiAgICAgIDxjaXJjbGUgY3g9IjYwIiBjeT0iLTgwIiByPSIyNSIvPgogICAgICA8ZWxsaXBzZSBjeD0iMCIgY3k9IjgwIiByeD0iNTAiIHJ5PSI2MCIvPgogICAgPC9nPgogICAgPGNpcmNsZSBjeD0iLTI1IiBjeT0iLTQwIiByPSIxMCIgZmlsbD0iI2ZmZiIvPgogICAgPGNpcmNsZSBjeD0iMjUiIGN5PSItNDAiIHI9IjEwIiBmaWxsPSIjZmZmIi8+CiAgICA8Y2lyY2xlIGN4PSItMjUiIGN5PSItNDAiIHI9IjQiIGZpbGw9IiMwMDAiLz4KICAgIDxjaXJjbGUgY3g9IjI1IiBjeT0iLTQwIiByPSI0IiBmaWxsPSIjMDAwIi8+CiAgICA8ZWxsaXBzZSBjeD0iMCIgY3k9Ii01IiByeD0iMjUiIHJ5PSIyMCIgZmlsbD0iI2VmZWJlOSIvPgogICAgPHBhdGggZD0iTTAgLTUgcSA1IDUgMCAxMCBxIC01IC01IDAgLTEweiIgZmlsbD0iIzAwMCIvPgogICAgPHBhdGggZD0iTS0yMCAyMCBBIDIwIDEwIDAgMCAwIDIwIDIwIiBmaWxsPSJub25lIiBzdHJva2Utd2lkdGg9IjQiLz4KICA8L2c+Cjwvc3ZnPg==';


function parseError(error: unknown): string {
  if (typeof error === 'string') {
    try {
      const parsed = JSON.parse(error);
      return parsed.message || error;
    } catch (e) {
      return error;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '알 수 없는 오류가 발생했습니다.';
}

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64string = reader.result as string;
      resolve(base64string.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const CREATIVE_IMAGE_SYSTEM_INSTRUCTION =
  'You are an expert digital artist and illustrator. Your task is to create a visually appealing and high-quality image based on the user\'s prompt. CRITICAL RULE: The output MUST be a purely visual image. It must NOT contain any text, letters, numbers, or characters of ANY language. This is absolute. You MUST strictly adhere to the requested aspect ratio.';

const SCENE_ANIMATION_SYSTEM_INSTRUCTION = `You are a world-class animation director. Transform a single static keyframe into a short animated scene.
- Return the complete sequence of images as requested (frame count).
- Maintain object permanence and visual consistency.
- No text allowed.`;

const ANIMATION_STYLES = [
  { name: '블루 타이', prompt: 'Rough SD character style with blue round head and red tie, black hand-drawn outlines.', icon: Bot, baseImage: BLUE_TIE_BASE_IMAGE_DATA_URL },
  { name: '레드타이 테디', prompt: 'Meme-style comical reaction cartoon, exaggerated expressions, rough black outlines.', icon: Laugh, baseImage: RED_TIE_TEDDY_BASE_IMAGE_DATA_URL },
  { name: '애니메이션', prompt: 'Modern Japanese anime style, vibrant colors, sharp lines.', icon: Film },
  { name: '카툰', prompt: 'Bubbly American cartoon style, soft rounded shapes, simple bright colors.', icon: Brush },
  { name: '픽셀아트', prompt: 'Retro 16-bit pixel art style.', icon: Grid3X3 },
  { name: '지브리', prompt: 'Painterly Ghibli-inspired style, soft lighting, nostalgic feel.', icon: Feather },
  { name: '스케치', prompt: 'Rough pencil sketch style, energetic hatching.', icon: PenTool },
  { name: '막대인간', prompt: 'Simple black and white stick figure minimalist style.', icon: PersonStanding },
  { name: '3D 렌더', prompt: 'High-quality 3D render, cinematic lighting, detailed textures.', icon: Cuboid },
  { name: '클레이', prompt: 'Digital claymation style, visible fingerprints, stop-motion look.', icon: Paintbrush },
  { name: '수채화', prompt: 'Soft watercolor painting, bleeding colors, textured paper.', icon: Droplet },
  { name: '필름 누아르', prompt: 'High-contrast black and white, dramatic shadows, 1940s film noir style.', icon: Camera },
  { name: '사이버펑크', prompt: 'Cyberpunk art style, neon lights, futuristic cityscapes, high-tech details.', icon: RadioTower },
  { name: '유화', prompt: 'Classic oil painting style, visible brushstrokes, rich textures.', icon: GalleryThumbnails },
  { name: '팝아트', prompt: 'Bold and colorful pop art style, inspired by Andy Warhol, using Ben-Day dots and vibrant colors.', icon: PaintBucket },
];


type AspectRatio = '16:9' | '9:16';
type ActiveTool = 'pen' | 'eraser' | 'ai-eraser' | 'pan';
type SynopsisScene = { title: string; prompt: string };
type ViewMode = 'timeline' | 'editor';
type GenerationConfig = { type: 'audio' | 'script'; data: any };

const ASPECT_RATIOS = {
  '16:9': {width: 960, height: 540},
  '9:16': {width: 540, height: 960},
};

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createWavBlob(pcmData: Uint8Array, sampleRate: number, numChannels: number): Blob {
  const bitsPerSample = 16;
  const dataSize = pcmData.length;
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  view.setUint32(0, 0x52494646, false);
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false);
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  return new Blob([view.buffer, pcmData], {type: 'audio/wav'});
}

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTool, setActiveTool] = useState<ActiveTool>('pen');
  const [penColor, setPenColor] = useState('#000000');
  const [penSize, setPenSize] = useState(5);
  const [eraserSize, setEraserSize] = useState(30);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash-image');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  
  const [frames, setFrames] = useState<(string | string[] | null)[]>([null]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [sceneData, setSceneData] = useState<SynopsisScene[]>([]);
  const [frameDurations, setFrameDurations] = useState<number[]>([1000]);
  const [fps, setFps] = useState(8);
  const [isPlaying, setIsPlaying] = useState(false);
  const [subFrameIndex, setSubFrameIndex] = useState(0);
  
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cast, setCast] = useState<string[]>([]);
  const [selectedCharacterIndices, setSelectedCharacterIndices] = useState<number[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

  const [audioInfo, setAudioInfo] = useState<{ url: string; duration: number; name: string; blob: Blob; } | null>(null);
  const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingWebM, setIsExportingWebM] = useState(false);
  
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [scriptText, setScriptText] = useState('');
  const [isGeneratingSynopsis, setIsGeneratingSynopsis] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAnimateModal, setShowAnimateModal] = useState(false);
  const [animationTargetIndex, setAnimationTargetIndex] = useState(-1);
  const [animationFrameCount, setAnimationFrameCount] = useState(8);
  const [isAnimatingFrame, setIsAnimatingFrame] = useState(-1);
  const [showAspectRatioConfirm, setShowAspectRatioConfirm] = useState(false);
  const [targetAspectRatio, setTargetAspectRatio] = useState<AspectRatio | null>(null);

  const [history, setHistory] = useState<{ [key: number]: (string | string[])[] }>({});
  const [historyIndex, setHistoryIndex] = useState<{ [key: number]: number }>({});
  
  const [showGenerationSettingsModal, setShowGenerationSettingsModal] = useState(false);
  const [generationConfig, setGenerationConfig] = useState<GenerationConfig | null>(null);

  const isInteracting = useRef(false);
  const lastPosition = useRef({ x: 0, y: 0 });
  const skipCanvasRedrawRef = useRef(false);
  const playbackTimeoutRef = useRef<number | null>(null);
  const subFramePlaybackRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);


  const currentFrameData = frames[currentFrameIndex];
  const displayImage = Array.isArray(currentFrameData) ? currentFrameData[subFrameIndex] : currentFrameData;
  const currentCanvasDimensions = ASPECT_RATIOS[aspectRatio];

  const drawCanvasContent = useCallback((canvas: HTMLCanvasElement | null, dataUrl: string | string[] | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.globalCompositeOperation = 'source-over';
    
    const imageUrl = Array.isArray(dataUrl) ? dataUrl[0] : dataUrl;
    if (imageUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = imageUrl;
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'editor' && !skipCanvasRedrawRef.current) {
      drawCanvasContent(canvasRef.current, currentFrameData);
    }
    skipCanvasRedrawRef.current = false;
  }, [currentFrameIndex, viewMode, currentFrameData, drawCanvasContent, aspectRatio]);

  useEffect(() => {
    if (subFramePlaybackRef.current) clearInterval(subFramePlaybackRef.current);
    if (Array.isArray(currentFrameData)) {
      let idx = 0;
      subFramePlaybackRef.current = window.setInterval(() => {
        idx = (idx + 1) % currentFrameData.length;
        setSubFrameIndex(idx);
      }, 1000 / fps);
    } else {
      setSubFrameIndex(0);
    }
    return () => { if (subFramePlaybackRef.current) clearInterval(subFramePlaybackRef.current); };
  }, [currentFrameData, fps]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('changedTouches' in e && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
  };

  const startInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (isPlaying) setIsPlaying(false);
    isInteracting.current = true;
    
    if (activeTool === 'pan') {
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
      }
      lastPosition.current = { x: clientX, y: clientY };
    } else {
      const { x, y } = getCoordinates(e);
      const ctx = activeTool === 'ai-eraser' ? overlayCanvasRef.current?.getContext('2d') : canvasRef.current?.getContext('2d');
      if (!ctx) return;
      
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (activeTool === 'pen') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penSize;
      } else if (activeTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = eraserSize;
      } else if (activeTool === 'ai-eraser') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.4)';
        ctx.lineWidth = eraserSize;
      }
      
      ctx.moveTo(x, y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const moveInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isInteracting.current) return;
    
    if (activeTool === 'pan') {
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
      }
      
      const dx = clientX - lastPosition.current.x;
      const dy = clientY - lastPosition.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPosition.current = { x: clientX, y: clientY };
    } else {
      const { x, y } = getCoordinates(e);
      const ctx = activeTool === 'ai-eraser' ? overlayCanvasRef.current?.getContext('2d') : canvasRef.current?.getContext('2d');
      if (!ctx) return;
      
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const stopInteraction = () => {
    if (!isInteracting.current) return;
    isInteracting.current = false;
    if (activeTool === 'pan') return;

    if (activeTool === 'ai-eraser') {
      handleAiInpaint();
    } else {
      const dataUrl = canvasRef.current?.toDataURL('image/png') || null;
      if (dataUrl) {
        skipCanvasRedrawRef.current = true;
        setFrames(prev => { const next = [...prev]; next[currentFrameIndex] = dataUrl; return next; });
        updateHistory(dataUrl);
      }
    }
  };

  const handleAiInpaint = async () => {
    const mainCanvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!mainCanvas || !overlayCanvas) return;
    const mCtx = mainCanvas.getContext('2d');
    if (!mCtx) return;
    mCtx.globalCompositeOperation = 'destination-out';
    mCtx.drawImage(overlayCanvas, 0, 0);
    mCtx.globalCompositeOperation = 'source-over';
    overlayCanvas.getContext('2d')?.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    const erasedData = mainCanvas.toDataURL('image/png');
    setIsLoading(true);
    try {
      const res = await ai.models.generateContent({
        model: selectedModel,
        contents: { parts: [{ inlineData: { data: erasedData.split(',')[1], mimeType: 'image/png' } }, { text: `Fill the erased area in this ${aspectRatio} image. Prompt: ${prompt}` }] },
        config: { imageConfig: { aspectRatio } }
      });
      const generated = res.candidates?.[0]?.content?.parts.find(p => p.inlineData)?.inlineData?.data;
      if (generated) {
        const url = `data:image/png;base64,${generated}`;
        setFrames(prev => { const next = [...prev]; next[currentFrameIndex] = url; return next; });
        drawCanvasContent(mainCanvas, url);
        updateHistory(url);
      }
    } catch (e) {
      setErrorMessage(parseError(e));
      setShowErrorModal(true);
    } finally { setIsLoading(false); }
  };

  const updateHistory = (data: string | string[] | null, replace = false) => {
    setHistory(prev => {
      const cur = prev[currentFrameIndex] || [];
      const idx = historyIndex[currentFrameIndex] ?? -1;
      const next = replace ? (data ? [data] : []) : (data ? [...cur.slice(0, idx + 1), data] : cur.slice(0, idx + 1));
      return { ...prev, [currentFrameIndex]: next };
    });
    setHistoryIndex(prev => ({ ...prev, [currentFrameIndex]: replace ? (data ? 0 : -1) : (data ? (prev[currentFrameIndex] ?? -1) + 1 : (prev[currentFrameIndex] ?? -1)) }));
  };

  const handleUndo = () => {
    const idx = historyIndex[currentFrameIndex] ?? 0;
    if (idx <= 0) return;
    const nextIdx = idx - 1;
    setHistoryIndex(prev => ({ ...prev, [currentFrameIndex]: nextIdx }));
    const data = history[currentFrameIndex][nextIdx];
    setFrames(prev => { const next = [...prev]; next[currentFrameIndex] = data; return next; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;
    setIsLoading(true);
    try {
      const parts: any[] = [];
      selectedCharacterIndices.forEach(idx => parts.push({ inlineData: { data: cast[idx].split(',')[1], mimeType: 'image/png' } }));
      let finalPrompt = `Create an image in ${aspectRatio} ratio. ${prompt}. Style: ${selectedStyle || 'detailed digital art'}. NO TEXT.`;
      parts.push({ text: finalPrompt });

      const res = await ai.models.generateContent({
        model: selectedModel,
        contents: { parts },
        config: { systemInstruction: CREATIVE_IMAGE_SYSTEM_INSTRUCTION, imageConfig: { aspectRatio } }
      });
      const generated = res.candidates?.[0]?.content?.parts.find(p => p.inlineData)?.inlineData?.data;
      if (generated) {
        const url = `data:image/png;base64,${generated}`;
        setFrames(prev => { const next = [...prev]; next[currentFrameIndex] = url; return next; });
        drawCanvasContent(canvasRef.current, url);
        updateHistory(url, true);
        setSceneData(prev => {
          const next = [...prev];
          while (next.length <= currentFrameIndex) next.push({ title: '', prompt: '' });
          next[currentFrameIndex].prompt = prompt;
          return next;
        });
      }
    } catch (e) {
      setErrorMessage(parseError(e));
      setShowErrorModal(true);
    } finally { setIsLoading(false); }
  };

  const handleAspectRatioChange = (newRatio: AspectRatio) => {
    if (newRatio === aspectRatio) return;
    if (frames.some(f => f !== null)) {
      setTargetAspectRatio(newRatio);
      setShowAspectRatioConfirm(true);
    } else {
      setAspectRatio(newRatio);
      setFrames(Array(frames.length).fill(null));
      setHistory({});
      setHistoryIndex({});
    }
  };

  const handleConfirmAspectRatioChange = () => {
    if (targetAspectRatio) {
      setAspectRatio(targetAspectRatio);
      setFrames(Array(frames.length).fill(null));
      setHistory({});
      setHistoryIndex({});
      setCurrentFrameIndex(0);
    }
    setShowAspectRatioConfirm(false);
  };

  const addFrame = () => {
    setFrames(prev => { const next = [...prev]; next.splice(currentFrameIndex + 1, 0, null); return next; });
    setSceneData(prev => { const next = [...prev]; next.splice(currentFrameIndex + 1, 0, {title: '', prompt: ''}); return next; });
    setFrameDurations(prev => { const next = [...prev]; next.splice(currentFrameIndex + 1, 0, 1000); return next; });
    setCurrentFrameIndex(currentFrameIndex + 1);
  };

  const deleteFrame = (idx: number) => {
    if (frames.length <= 1) return;
    setFrames(prev => prev.filter((_, i) => i !== idx));
    setSceneData(prev => prev.filter((_, i) => i !== idx));
    setFrameDurations(prev => prev.filter((_, i) => i !== idx));
    if (currentFrameIndex >= idx) setCurrentFrameIndex(Math.max(0, currentFrameIndex - 1));
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const newFrames = [...frames];
      newFrames[currentFrameIndex] = dataUrl;
      setFrames(newFrames);
      updateHistory(dataUrl, true);
      setViewMode('editor');
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };
  
  const handleAudioUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsTranscribing(true);
    try {
      const url = URL.createObjectURL(file);
      const audioContext = new AudioContext();
      const buffer = await audioContext.decodeAudioData(await file.arrayBuffer());
      setAudioInfo({ url, duration: buffer.duration, name: file.name, blob: file });
  
      const audioBase64 = await blobToBase64(file);
      const transcriptionRes = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: { parts: [{ inlineData: { data: audioBase64, mimeType: file.type } }, { text: '이 오디오를 한글로 전사해줘.' }] }
      });
      const transcript = transcriptionRes.text;
      if (!transcript) {
        throw new Error("음성 변환에 실패했거나 텍스트가 비어있습니다.");
      }
      setGenerationConfig({
        type: 'audio',
        data: { transcript, duration: buffer.duration }
      });
      setShowGenerationSettingsModal(true);
    } catch (err) {
      setErrorMessage(parseError(err));
      setShowErrorModal(true);
    } finally {
      setIsTranscribing(false);
    }
    if (e.target) e.target.value = '';
  };

  const handleRemoveAudio = () => { if (audioInfo) URL.revokeObjectURL(audioInfo.url); setAudioInfo(null); };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setFrames(prev => {
      const next = [...prev];
      next[currentFrameIndex] = null;
      return next;
    });
    updateHistory(null, true);
  };

  const handleSaveCharacter = () => {
    if (typeof currentFrameData === 'string' && currentFrameData) {
      setCast(prev => [...prev, currentFrameData]);
    }
  };

  const handleSelectCharacter = (idx: number) => {
    setSelectedCharacterIndices(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleRemoveCharacter = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    setCast(prev => prev.filter((_, i) => i !== idx));
    setSelectedCharacterIndices(prev => prev.filter(i => i !== idx));
  };

  const handleGenerateNarration = async () => {
    const textToSpeak = sceneData[currentFrameIndex]?.prompt || prompt;
    if (!textToSpeak) return;
    
    setIsGeneratingNarration(true);
    try {
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: `Say this naturally for an animation: ${textToSpeak}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        const decodedBytes = decode(base64Audio);
        const audioBuffer = await decodeAudioData(decodedBytes, audioContext, 24000, 1);
        const wavBlob = createWavBlob(decodedBytes, 24000, 1);
        const url = URL.createObjectURL(wavBlob);
        setAudioInfo({ url, duration: audioBuffer.duration, name: `narration_scene_${currentFrameIndex + 1}.wav`, blob: wavBlob });
      }
    } catch (e) {
      setErrorMessage(parseError(e));
      setShowErrorModal(true);
    } finally {
      setIsGeneratingNarration(false);
    }
  };
  
  const handleConfirmGeneration = async (settings: { sceneCount: number }) => {
    if (!generationConfig) return;
    setIsGeneratingSynopsis(true);
    setShowGenerationSettingsModal(false);
    try {
        const { type, data } = generationConfig;
        let finalPrompt = '';

        if (type === 'audio') {
            finalPrompt = `다음 스크립트를 분석하여 총 ${settings.sceneCount}개의 애니메이션 장면으로 나눠주세요. 오디오 총 길이는 ${data.duration.toFixed(1)}초입니다. 길이를 고려하여 장면 수를 적절히 조절해주세요. 각 장면에 대해 짧고 설명적인 'title'과 AI 이미지 생성기를 위한 상세한 시각적 'prompt'를 제공해주세요. 프롬프트는 핵심 액션, 캐릭터, 설정, 분위기를 포착해야 합니다. 각 객체에 'title'과 'prompt' 키가 있는 객체의 JSON 배열로 응답해주세요. 프롬프트는 반드시 한국어로 작성해주세요. 스크립트: ${data.transcript}`;
        } else { // script
            finalPrompt = `다음 스크립트를 분석하여 총 ${settings.sceneCount}개의 애니메이션 장면으로 나눠주세요. 각 장면에 대해 짧고 설명적인 'title'과 AI 이미지 생성기를 위한 상세한 시각적 'prompt'를 제공해주세요. 프롬프트는 핵심 액션, 캐릭터, 설정, 분위기를 포착해야 합니다. 각 객체에 'title'과 'prompt' 키가 있는 객체의 JSON 배열로 응답해주세요. 프롬프트는 반드시 한국어로 작성해주세요. 스크립트: ${data.script}`;
        }

        const res = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: finalPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            prompt: { type: Type.STRING }
                        },
                        required: ["title", "prompt"]
                    }
                }
            }
        });
        const synopsis = JSON.parse(res.text);
        setSceneData(synopsis);
        setFrames(Array(synopsis.length).fill(null));
        const durationPerFrame = type === 'audio' ? (data.duration * 1000 / synopsis.length) : 1000;
        setFrameDurations(Array(synopsis.length).fill(durationPerFrame));
        setCurrentFrameIndex(0);

    } catch (e) {
        setErrorMessage(parseError(e));
        setShowErrorModal(true);
    } finally {
        setIsGeneratingSynopsis(false);
        setGenerationConfig(null);
    }
};

  const handleGenerateAllScenes = async () => {
      setIsLoading(true);
      const newFrames = [...frames];
      for (let i = 0; i < sceneData.length; i++) {
          if (frames[i] !== null) continue;
          setIsAnimatingFrame(i);
          try {
              const res = await ai.models.generateContent({
                  model: selectedModel,
                  contents: { parts: [{ text: `Create an image in ${aspectRatio} ratio. ${sceneData[i].prompt}. Style: ${selectedStyle || 'detailed digital art'}. NO TEXT.` }] },
                  config: { systemInstruction: CREATIVE_IMAGE_SYSTEM_INSTRUCTION, imageConfig: { aspectRatio } }
              });
              const generated = res.candidates?.[0]?.content?.parts.find(p => p.inlineData)?.inlineData?.data;
              if (generated) {
                  newFrames[i] = `data:image/png;base64,${generated}`;
                  setFrames([...newFrames]);
              }
          } catch (e) {
              setErrorMessage(`${i+1}번째 장면 생성 중 오류 발생: ${parseError(e)}`);
              setShowErrorModal(true);
              break; 
          }
      }
      setIsAnimatingFrame(-1);
      setIsLoading(false);
  };


  const handleExportFrames = async () => {
    const zip = new JSZip();
    frames.forEach((f, i) => {
      if (Array.isArray(f)) {
        f.forEach((sub, j) => {
          zip.file(`scene_${i+1}_frame_${j+1}.png`, sub.split(',')[1], {base64: true});
        });
      } else if (f) {
        zip.file(`scene_${i+1}.png`, f.split(',')[1], {base64: true});
      }
    });
    const content = await zip.generateAsync({type: "blob"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = 'frames.zip';
    a.click();
    setShowExportModal(false);
  };

  const handleExportGif = async () => {
    if (isExporting) return;
    const allFrames = frames.flat().filter((f): f is string => f !== null);
    if (allFrames.length === 0) return;
    setIsExporting(true);
    const gif = new GIF({ workers: 2, quality: 10, width: currentCanvasDimensions.width, height: currentCanvasDimensions.height, workerScript: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js' });
    const imgs = await Promise.all(allFrames.map(url => new Promise<HTMLImageElement>((res) => { const i = new Image(); i.onload = () => res(i); i.src = url; })));
    let imgIdx = 0;
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i]; if (!f) continue;
      const sub = Array.isArray(f) ? f : [f];
      const d = (frameDurations[i] || 1000) / sub.length;
      for (const _ of sub) { gif.addFrame(imgs[imgIdx++], { delay: d }); }
    }
    gif.on('finished', (blob: Blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'animation.gif'; a.click(); setIsExporting(false); setShowExportModal(false); });
    gif.render();
  };

  const handleExportWebM = async () => {
    setIsExportingWebM(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = currentCanvasDimensions.width;
      canvas.height = currentCanvasDimensions.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const stream = canvas.captureStream();
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(chunks, {type: 'video/webm'})); a.download = 'animation.webm'; a.click(); setIsExportingWebM(false); setShowExportModal(false); };
      const all = frames.flat().filter((f): f is string => f !== null);
      const imgs = await Promise.all(all.map(url => new Promise<HTMLImageElement>((res) => { const i = new Image(); i.onload = () => res(i); i.src = url; })));
      recorder.start();
      let idx = 0;
      for (let i = 0; i < frames.length; i++) {
        const f = frames[i]; if (!f) continue;
        const sub = Array.isArray(f) ? f : [f];
        const dur = (frameDurations[i] || 1000) / sub.length;
        for (const _ of sub) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(imgs[idx++], 0, 0, canvas.width, canvas.height);
          await new Promise(r => setTimeout(r, dur));
        }
      }
      recorder.stop();
    } catch (e) { setErrorMessage(parseError(e)); setIsExportingWebM(false); }
  };

  const handleAnimateFrame = async (idx: number, count: number) => {
    const src = frames[idx]; if (typeof src !== 'string' || !src) return;
    setShowAnimateModal(false);
    setIsAnimatingFrame(idx);
    try {
      const res = await ai.models.generateContent({
        model: selectedModel,
        contents: { parts: [{ inlineData: { data: src.split(',')[1], mimeType: 'image/png' } }, { text: `Generate ${count} frames animation.` }] },
        config: { systemInstruction: SCENE_ANIMATION_SYSTEM_INSTRUCTION, imageConfig: { aspectRatio } }
      });
      const subs: string[] = [];
      for (const part of res.candidates?.[0]?.content?.parts || []) { if (part.inlineData) subs.push(`data:image/png;base64,${part.inlineData.data}`); }
      if (subs.length > 1) {
        setFrames(prev => { const next = [...prev]; next[idx] = subs; return next; });
        updateHistory(subs, true);
      }
    } finally { setIsAnimatingFrame(-1); }
  };

  const closeErrorModal = () => setShowErrorModal(false);

  const handleSelectStyle = (style: { name: string; prompt: string; icon: React.ElementType; baseImage?: string; }) => {
    setSelectedStyle(style.prompt);
    if (style.baseImage) {
      const dataUrl = style.baseImage;
      setFrames(prev => {
        const next = [...prev];
        next[currentFrameIndex] = dataUrl;
        return next;
      });
      updateHistory(dataUrl, true);
      setPrompt(`A ${style.name} character is `); // Pre-fill prompt
    }
  };

  const renderTimelineView = () => (
    <div className="flex-grow w-full flex flex-col md:flex-row items-stretch gap-4 overflow-hidden">
      <div className="flex-grow flex flex-col items-center justify-center p-4 bg-slate-200 rounded-xl min-h-[40vh] relative">
        <div className="w-full max-w-full max-h-full relative bg-white shadow-xl flex items-center justify-center rounded-lg overflow-hidden" style={{ aspectRatio: aspectRatio.replace(':', ' / ') }}>
          <div className="absolute inset-0 bg-[conic-gradient(#ccc_25%,#eee_0_50%,#ccc_0_75%,#eee_0)] bg-[length:20px_20px]"></div>
          {(isAnimatingFrame > -1 || isGeneratingSynopsis) && <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-20 text-white"><LoaderCircle className="w-10 h-10 animate-spin mb-4"/><p className="font-bold">{isGeneratingSynopsis ? "장면 분석 중..." : `${isAnimatingFrame + 1}번 장면 생성 중...`}</p></div>}
          {displayImage ? <img src={displayImage} className="absolute inset-0 w-full h-full object-contain z-10" /> : <p className="text-slate-400 font-bold z-10">빈 프레임</p>}
        </div>
        <div className="mt-4 flex gap-4 z-20">
          <button onClick={() => setIsPlaying(!isPlaying)} className="w-14 h-14 bg-white shadow-lg rounded-full flex items-center justify-center hover:scale-110 transition-transform">
            {isPlaying ? <Pause className="text-slate-700"/> : <Play className="ml-1 text-slate-700"/>}
          </button>
        </div>
      </div>
      <aside className="w-full md:w-[400px] flex flex-col gap-4">
        <div className="bg-white/70 p-4 rounded-xl shadow-sm flex justify-between items-center">
          <div><h1 className="font-bold text-lg">Animation Studio</h1><p className="text-xs text-slate-500">Native Gemini Image Gen</p></div>
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><Settings2 className="w-5 h-5"/></button>
        </div>
        {showSettings && (
          <div className="bg-white p-4 rounded-xl shadow-lg space-y-4">
            <div><label className="text-xs font-bold block mb-1">모델</label><select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className="w-full p-2 border rounded text-sm"><option value="gemini-2.5-flash-image">Gemini 2.5 Flash</option><option value="gemini-3-pro-image-preview">Gemini 3.0 Pro</option></select></div>
            <button onClick={() => setShowExportModal(true)} className="w-full py-2 bg-slate-800 text-white rounded text-sm font-bold flex items-center justify-center gap-2"><Download className="w-4 h-4"/>콘텐츠 내보내기</button>
          </div>
        )}
        <div className="flex-grow bg-white/70 p-4 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm">타임라인</h3>
              <div className="flex gap-2">
                  <button onClick={() => setShowScriptModal(true)} className="text-xs flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm hover:bg-slate-50"><FileText className="w-3 h-3"/> 스크립트</button>
                  <button onClick={addFrame} className="text-xs flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm hover:bg-slate-50"><Plus className="w-3 h-3"/> 프레임 추가</button>
              </div>
          </div>
          {sceneData.length > 0 && frames.some(f => f === null) && (
              <button onClick={handleGenerateAllScenes} disabled={isLoading} className="w-full mb-2 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-slate-400">
                  {isLoading ? <><LoaderCircle className="w-4 h-4 animate-spin"/> 생성 중...</> : <><Clapperboard className="w-4 h-4"/> 모든 장면 생성</>}
              </button>
          )}
          <div className="flex-grow overflow-y-auto space-y-2 pr-2">
            {frames.map((f, i) => (
              <div key={i} onClick={() => setCurrentFrameIndex(i)} onDoubleClick={() => setViewMode('editor')} className={`relative flex items-center gap-3 p-2 rounded-lg cursor-pointer border-2 transition-all ${currentFrameIndex === i ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-white'}`}>
                {isAnimatingFrame === i && <div className="absolute inset-0 bg-blue-500/20 rounded-lg flex items-center justify-center"><LoaderCircle className="w-5 h-5 text-white animate-spin"/></div>}
                <div className="w-20 h-12 bg-slate-200 rounded overflow-hidden flex items-center justify-center">{f ? <img src={Array.isArray(f) ? f[0] : f} className="w-full h-full object-contain"/> : <span className="text-[10px] text-slate-400">빈 프레임</span>}</div>
                <div className="flex-grow min-w-0"><p className="text-xs font-bold">Scene {i+1}</p><p className="text-[10px] text-slate-500 truncate">{sceneData[i]?.prompt || '내용 없음'}</p></div>
                <div className="flex flex-col gap-1">
                  <button onClick={(e) => { e.stopPropagation(); setAnimationTargetIndex(i); setShowAnimateModal(true); }} className="p-1 hover:bg-blue-200 rounded"><Sparkles className="w-3 h-3 text-blue-500"/></button>
                  <button onClick={(e) => { e.stopPropagation(); deleteFrame(i); }} className="p-1 hover:bg-red-200 rounded"><Trash2 className="w-3 h-3 text-red-500"/></button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t space-y-3">
            <div className="flex items-center gap-2"><span className="text-[10px] font-bold">FPS</span><input type="range" min="1" max="24" value={fps} onChange={e => setFps(Number(e.target.value))} className="flex-grow"/><span className="text-[10px] w-4">{fps}</span></div>
            <div className="flex justify-between items-center"><div className="flex items-center gap-1"><span className="text-[10px]">시간:</span><input type="number" step="0.1" value={((frameDurations[currentFrameIndex] || 1000)/1000).toFixed(1)} onChange={e => { const v = Number(e.target.value); if(v>0){ const n = [...frameDurations]; n[currentFrameIndex] = v*1000; setFrameDurations(n); } }} className="w-10 text-[10px] border rounded p-0.5 text-center"/></div><button onClick={handleGenerateNarration} disabled={isGeneratingNarration} className="p-2 bg-white shadow rounded-full hover:scale-110 disabled:opacity-50">{isGeneratingNarration ? <LoaderCircle className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4 text-blue-500"/>}</button></div>
            {audioInfo && <div className="p-2 bg-blue-50 border rounded-lg flex items-center gap-2"><audio src={audioInfo.url} controls className="h-6 flex-grow"/><button onClick={handleRemoveAudio}><Trash2 className="w-4 h-4 text-slate-400"/></button></div>}
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => imageInputRef.current?.click()} className="w-full py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center justify-center gap-2">
                    <ImageUp className="w-4 h-4"/> 이미지 업로드
                </button>
                <button onClick={() => audioInputRef.current?.click()} disabled={isTranscribing} className="w-full py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center justify-center gap-2 disabled:opacity-50">
                    {isTranscribing ? <><LoaderCircle className="w-4 h-4 animate-spin"/> 분석 중...</> : <><Music2 className="w-4 h-4"/> 음성 업로드</>}
                </button>
            </div>
            <input type="file" ref={audioInputRef} className="hidden" accept="audio/*" onChange={handleAudioUpload}/>
            <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageUpload}/>
          </div>
        </div>
      </aside>
    </div>
  );

  const renderEditorView = () => (
    <div className="flex-grow flex flex-col gap-4 overflow-hidden">
      <header className="flex justify-between items-center">
        <button onClick={() => setViewMode('timeline')} className="h-12 px-6 bg-white shadow-md rounded-full flex items-center gap-2 font-bold text-sm hover:scale-105 transition-transform"><ArrowLeft className="w-4 h-4"/> 타임라인으로 돌아가기</button>
        <div className="flex p-1 bg-slate-200 rounded-full">
            <button onClick={() => handleAspectRatioChange('16:9')} className={`p-3 rounded-full transition-all ${aspectRatio === '16:9' ? 'bg-white shadow' : ''}`}>
                <RectangleHorizontal className="w-5 h-5"/>
            </button>
            <button onClick={() => handleAspectRatioChange('9:16')} className={`p-3 rounded-full transition-all ${aspectRatio === '9:16' ? 'bg-white shadow' : ''}`}>
                <RectangleVertical className="w-5 h-5"/>
            </button>
        </div>
      </header>
      <div className="flex-grow flex flex-col md:flex-row gap-4 overflow-hidden">
        <aside className="w-full md:w-20 flex md:flex-col gap-2 p-2 bg-white/70 rounded-xl shadow-sm border border-white">
          <button onClick={() => setActiveTool('pen')} className={`p-4 rounded-xl transition-all ${activeTool === 'pen' ? 'bg-blue-600 text-white scale-110 shadow-lg' : 'bg-white hover:bg-slate-100'}`}><PenTool className="w-5 h-5"/></button>
          <button onClick={() => setActiveTool('eraser')} className={`p-4 rounded-xl transition-all ${activeTool === 'eraser' ? 'bg-blue-600 text-white scale-110 shadow-lg' : 'bg-white hover:bg-slate-100'}`}><Eraser className="w-5 h-5"/></button>
          <button onClick={() => setActiveTool('ai-eraser')} className={`p-4 rounded-xl transition-all ${activeTool === 'ai-eraser' ? 'bg-blue-600 text-white scale-110 shadow-lg' : 'bg-white hover:bg-slate-100'}`} title="AI 지우개"><Sparkles className="w-5 h-5"/></button>
          <button onClick={() => setActiveTool('pan')} className={`p-4 rounded-xl transition-all ${activeTool === 'pan' ? 'bg-blue-600 text-white scale-110 shadow-lg' : 'bg-white hover:bg-slate-100'}`}><Hand className="w-5 h-5"/></button>
          <div className="h-px bg-slate-300 mx-2 my-2 hidden md:block"></div>
          <button onClick={() => colorInputRef.current?.click()} className="p-4 rounded-xl bg-white shadow-sm flex justify-center hover:scale-105"><div className="w-6 h-6 rounded-full border-2 border-white shadow-inner" style={{backgroundColor: penColor}}></div></button>
          <input type="color" ref={colorInputRef} className="hidden" value={penColor} onChange={e => setPenColor(e.target.value)}/>
          <button onClick={handleUndo} className="p-4 rounded-xl bg-white disabled:opacity-30 hover:scale-105" disabled={!(historyIndex[currentFrameIndex] > 0)}><RotateCcw className="w-5 h-5"/></button>
          <button onClick={clearCanvas} className="p-4 rounded-xl bg-white hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5"/></button>
        </aside>

        <div className="flex-grow flex flex-col gap-4 overflow-hidden">
          <div className="flex-grow relative bg-white overflow-hidden rounded-xl shadow-inner flex items-center justify-center p-8 border-4 border-white">
            <div className="absolute inset-0 bg-[conic-gradient(#ccc_25%,#eee_0_50%,#ccc_0_75%,#eee_0)] bg-[length:24px_24px]"></div>
            <div className="relative shadow-2xl z-10 bg-white" style={{ aspectRatio: `${currentCanvasDimensions.width} / ${currentCanvasDimensions.height}`, width: 'auto', height: '100%' }}>
              <canvas ref={canvasRef} width={currentCanvasDimensions.width} height={currentCanvasDimensions.height} onMouseDown={startInteraction} onMouseMove={moveInteraction} onMouseUp={stopInteraction} onMouseLeave={stopInteraction} onTouchStart={startInteraction} onTouchMove={moveInteraction} onTouchEnd={stopInteraction} className="absolute top-0 left-0 w-full h-full z-20 touch-none cursor-crosshair" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'top left' }} />
              <canvas ref={overlayCanvasRef} width={currentCanvasDimensions.width} height={currentCanvasDimensions.height} className="absolute top-0 left-0 w-full h-full z-30 pointer-events-none" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'top left' }} />
            </div>
          </div>
          <form onSubmit={handleSubmit} className="relative group">
            <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="만들고 싶은 이미지를 설명하세요..." className="w-full h-16 pl-6 pr-20 bg-white shadow-xl rounded-2xl border-2 border-transparent focus:border-blue-500 focus:outline-none transition-all font-medium text-lg" />
            <button type="submit" disabled={isLoading} className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 disabled:bg-slate-300 transition-all flex items-center justify-center">
              {isLoading ? <LoaderCircle className="w-6 h-6 animate-spin"/> : <SendHorizontal className="w-6 h-6"/>}
            </button>
          </form>
        </div>

        <aside className="w-full md:w-60 overflow-y-auto bg-white/70 p-4 rounded-xl shadow-sm border border-white flex flex-col gap-6">
          <div>
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><Palette className="w-4 h-4"/> 스타일</h4>
            <div className="grid grid-cols-2 gap-2">
              {ANIMATION_STYLES.map(s => (<button key={s.name} onClick={() => handleSelectStyle(s)} className={`p-3 rounded-xl border-2 text-center text-[10px] font-bold transition-all ${selectedStyle === s.prompt ? 'border-blue-500 bg-blue-50 text-blue-600 scale-105' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}><s.icon className="w-5 h-5 mx-auto mb-1"/>{s.name}</button>))}
            </div>
          </div>
          <div><div className="flex justify-between items-center mb-3"><h4 className="text-sm font-bold flex items-center gap-2"><Users className="w-4 h-4"/> 캐릭터</h4><button onClick={handleSaveCharacter} className="p-1 hover:bg-slate-200 rounded"><UserPlus className="w-4 h-4"/></button></div><div className="grid grid-cols-2 gap-2">{cast.map((c, i) => (<div key={i} onClick={() => handleSelectCharacter(i)} className={`relative p-1 rounded-xl border-2 cursor-pointer transition-all ${selectedCharacterIndices.includes(i) ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white'}`}><img src={c} className="w-full aspect-square object-contain rounded-lg"/><button onClick={e => handleRemoveCharacter(e, i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center shadow-lg hover:scale-110">X</button></div>))}</div></div>
        </aside>
      </div>
    </div>
  );

  const errorModal = showErrorModal && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-red-600">오류 발생</h3>
                <button onClick={closeErrorModal} className="p-1 hover:bg-slate-200 rounded-full"><X className="w-5 h-5"/></button>
            </div>
            <p className="text-sm text-slate-700 bg-red-50 p-3 rounded-lg">{errorMessage}</p>
            <button onClick={closeErrorModal} className="w-full mt-6 py-2 bg-slate-800 text-white rounded-lg font-bold text-sm">닫기</button>
        </div>
    </div>
  );

  const aspectRatioConfirmationModal = showAspectRatioConfirm && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm text-center">
        <h3 className="font-bold text-lg mb-2">화면 비율 변경</h3>
        <p className="text-sm text-slate-600 mb-6">화면 비율을 변경하면 모든 프레임이 삭제됩니다. 계속하시겠습니까?</p>
        <div className="flex gap-4">
          <button onClick={() => setShowAspectRatioConfirm(false)} className="flex-1 py-2 bg-slate-200 rounded-lg font-bold text-sm hover:bg-slate-300 transition-colors">취소</button>
          <button onClick={handleConfirmAspectRatioChange} className="flex-1 py-2 bg-red-500 text-white rounded-lg font-bold text-sm hover:bg-red-600 transition-colors">삭제하고 변경</button>
        </div>
      </div>
    </div>
  );
  
  const scriptModal = showScriptModal && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-2xl flex flex-col h-[80vh]">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2"><FileText className="w-5 h-5"/> 스크립트로 장면 만들기</h3>
                <button onClick={() => setShowScriptModal(false)} className="p-1 hover:bg-slate-200 rounded-full"><X className="w-5 h-5"/></button>
            </div>
            <textarea value={scriptText} onChange={e => setScriptText(e.target.value)} placeholder="여기에 이야기나 시나리오를 붙여넣으세요..." className="flex-grow w-full p-4 border rounded-lg resize-none text-sm leading-relaxed"></textarea>
            <button 
              onClick={() => {
                setGenerationConfig({ type: 'script', data: { script: scriptText } });
                setShowGenerationSettingsModal(true);
                setShowScriptModal(false);
              }} 
              disabled={!scriptText}
              className="w-full mt-6 py-3 bg-blue-600 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-slate-400">
                <Settings2 className="w-5 h-5"/> 다음
            </button>
        </div>
    </div>
  );
  
  const generationSettingsModal = showGenerationSettingsModal && generationConfig && (
      <GenerationSettingsModal
          isOpen={showGenerationSettingsModal}
          onClose={() => setShowGenerationSettingsModal(false)}
          config={generationConfig}
          onSubmit={handleConfirmGeneration}
      />
  );

  return (
    <div className="w-full h-full p-4 flex flex-col font-sans text-slate-800">
        {errorModal}
        {aspectRatioConfirmationModal}
        {scriptModal}
        {generationSettingsModal}
        {viewMode === 'timeline' ? renderTimelineView() : renderEditorView()}
    </div>
  );
}

function GenerationSettingsModal({ isOpen, onClose, config, onSubmit }) {
    const [activeTab, setActiveTab] = useState<'simple' | 'detailed'>('simple');
    const [sceneCount, setSceneCount] = useState(5);
    const [secondsPerScene, setSecondsPerScene] = useState(5);
    const [charsPerScene, setCharsPerScene] = useState(150);

    const sourceText = config.type === 'audio' ? `오디오 (${config.data.duration.toFixed(1)}초)` : `스크립트 (${config.data.script.length}자)`;

    useEffect(() => {
        if (config.type === 'audio') {
            const calculatedScenes = Math.max(1, Math.round(config.data.duration / secondsPerScene));
            setSceneCount(calculatedScenes);
        } else {
            const calculatedScenes = Math.max(1, Math.round(config.data.script.length / charsPerScene));
            setSceneCount(calculatedScenes);
        }
    }, [config, secondsPerScene, charsPerScene]);

    const handleDetailedSceneCountChange = (value) => {
        const count = Number(value);
        if (count > 0) {
            setSceneCount(count);
            if (config.type === 'audio') {
                setSecondsPerScene(config.data.duration / count);
            } else {
                setCharsPerScene(config.data.script.length / count);
            }
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">장면 생성 설정 ({sourceText})</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full"><X className="w-5 h-5"/></button>
                </div>

                <div className="border-b border-slate-200 mb-4">
                    <nav className="-mb-px flex space-x-6">
                        <button onClick={() => setActiveTab('simple')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'simple' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>간단 설정</button>
                        <button onClick={() => setActiveTab('detailed')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'detailed' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>세부 설정</button>
                    </nav>
                </div>

                <div className="space-y-4">
                    {activeTab === 'simple' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700">장면 수: {sceneCount}</label>
                            <input type="range" min="1" max="50" value={sceneCount} onChange={e => handleDetailedSceneCountChange(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"/>
                        </div>
                    )}
                    {activeTab === 'detailed' && (
                        <div className="space-y-4">
                            {config.type === 'audio' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">장면 당 평균 시간 (초)</label>
                                    <input type="number" value={secondsPerScene.toFixed(1)} onChange={e => setSecondsPerScene(Number(e.target.value))} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"/>
                                </div>
                            )}
                             {config.type === 'script' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">장면 당 평균 글자 수</label>
                                    <input type="number" value={Math.round(charsPerScene)} onChange={e => setCharsPerScene(Number(e.target.value))} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"/>
                                </div>
                            )}
                             <div>
                                <label className="block text-sm font-bold text-slate-700">총 장면 수 (직접 입력)</label>
                                <input type="number" value={sceneCount} onChange={e => handleDetailedSceneCountChange(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"/>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-4 mt-8">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-200 text-slate-800 rounded-lg font-bold text-sm hover:bg-slate-300">취소</button>
                    <button onClick={() => onSubmit({ sceneCount })} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700">장면 생성</button>
                </div>
            </div>
        </div>
    );
}