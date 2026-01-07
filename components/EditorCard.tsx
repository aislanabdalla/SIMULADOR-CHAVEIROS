
import React, { useRef, useState, useEffect } from 'react';
import { PrintSettings, ShapeType } from '../types';

interface EditorCardProps {
  settings: PrintSettings;
  updateSettings: (newSettings: Partial<PrintSettings>) => void;
  logo: string | null;
  onGenerate: (processedImage?: string) => void;
  isGenerating: boolean;
}

const SHAPES = [
  { type: ShapeType.ROUND, label: 'Round', icon: 'rounded-full' },
  { type: ShapeType.SQUARE, label: 'Square', icon: 'rounded-none' },
  { type: ShapeType.RECT, label: 'Rect', icon: 'rounded-sm aspect-video' },
  { type: ShapeType.CONTOUR, label: 'Contour', icon: 'border-2 border-dashed border-slate-400 rounded-lg' },
];

const BASE_COLORS = [
  '#000000', '#1e293b', '#ffffff', '#dc2626', '#2563eb', '#16a34a', '#d97706'
];

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const colorDistance = (c1: {r:number, g:number, b:number}, c2: {r:number, g:number, b:number}) => {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) + 
    Math.pow(c1.g - c2.g, 2) + 
    Math.pow(c1.b - c2.b, 2)
  );
};

const rgbToHex = (r: number, g: number, b: number) => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

export const EditorCard: React.FC<EditorCardProps> = ({ 
  settings, 
  updateSettings, 
  logo,
  onGenerate,
  isGenerating
}) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeColorIndex, setActiveColorIndex] = useState<number | null>(null);
  
  const [processedLogo, setProcessedLogo] = useState<string | null>(null);
  const [detectedPalette, setDetectedPalette] = useState<string[]>([]);
  
  useEffect(() => {
    if (!logo) {
      setProcessedLogo(null);
      setDetectedPalette([]);
      return;
    }

    const processImage = async () => {
      const img = new Image();
      img.src = logo;
      await new Promise((resolve) => { img.onload = resolve; });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const MAX_WIDTH = 600;
      const scale = Math.min(1, MAX_WIDTH / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const colorCounts: Record<string, number> = {};
      const rgbValues: Record<string, {r:number, g:number, b:number}> = {};

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        
        const key = `${r},${g},${b}`;
        colorCounts[key] = (colorCounts[key] || 0) + 1;
        rgbValues[key] = {r, g, b};
      }

      const sortedColors = Object.keys(colorCounts).sort((a, b) => colorCounts[b] - colorCounts[a]);
      const finalPalette: string[] = [];
      const distinctThreshold = 35; 
      const maxPaletteSize = settings.maxColors; 

      for (const key of sortedColors) {
        if (finalPalette.length >= maxPaletteSize) break;
        const candRgb = rgbValues[key];
        
        let isDistinct = true;
        for (const palHex of finalPalette) {
           const palRgb = hexToRgb(palHex);
           if (colorDistance(candRgb, palRgb) < distinctThreshold) {
             isDistinct = false;
             break;
           }
        }
        
        if (isDistinct) {
          finalPalette.push(rgbToHex(candRgb.r, candRgb.g, candRgb.b));
        }
      }
      
      setDetectedPalette(finalPalette);
      
      const newImageData = ctx.createImageData(canvas.width, canvas.height);
      const newData = newImageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha < 10) {
          newData[i+3] = 0; 
          continue;
        }

        const currentRgb = { r: data[i], g: data[i+1], b: data[i+2] };
        let minDist = Infinity;
        let nearestHex = finalPalette[0] || "#000000";

        for (const palHex of finalPalette) {
          const palRgb = hexToRgb(palHex);
          const dist = colorDistance(currentRgb, palRgb);
          if (dist < minDist) {
            minDist = dist;
            nearestHex = palHex;
          }
        }

        if (settings.erasedColors.includes(nearestHex)) {
            newData[i+3] = 0;
            continue;
        }

        const finalHex = settings.colorMapping[nearestHex] || nearestHex;
        const finalRgb = hexToRgb(finalHex);

        newData[i] = finalRgb.r;
        newData[i+1] = finalRgb.g;
        newData[i+2] = finalRgb.b;
        newData[i+3] = alpha > 200 ? 255 : alpha;
      }

      ctx.putImageData(newImageData, 0, 0);
      setProcessedLogo(canvas.toDataURL());
    };

    processImage();
  }, [logo, settings.colorMapping, settings.maxColors, settings.erasedColors]); 

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).id === 'hole-handle') {
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      e.stopPropagation(); 
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    let x = e.clientX - rect.left - centerX;
    let y = e.clientY - rect.top - centerY;
    updateSettings({ holePosition: { x, y } });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleColorSwap = (originalColor: string, newColor: string) => {
    updateSettings({
        colorMapping: {
            ...settings.colorMapping,
            [originalColor]: newColor
        }
    });
  };

  const toggleEraseColor = (originalColor: string) => {
    const isCurrentlyErased = settings.erasedColors.includes(originalColor);
    if (isCurrentlyErased) {
        updateSettings({
            erasedColors: settings.erasedColors.filter(c => c !== originalColor)
        });
    } else {
        updateSettings({
            erasedColors: [...settings.erasedColors, originalColor]
        });
    }
  };
  
  const handlePreviewClick = (e: React.MouseEvent) => {
      if (isDragging) return;
      if (!imgRef.current) return;
      
      const rect = imgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      if (x < 0 || x > rect.width || y < 0 || y > rect.height) return;

      const naturalX = (x / rect.width) * imgRef.current.naturalWidth;
      const naturalY = (y / rect.height) * imgRef.current.naturalHeight;

      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(imgRef.current, naturalX, naturalY, 1, 1, 0, 0, 1, 1);
      const p = ctx.getImageData(0,0,1,1).data;
      if (p[3] === 0) return; 
      
      const clickedRgb = { r: p[0], g: p[1], b: p[2] };

      let foundIndex = -1;
      let minDistance = Infinity;
      
      detectedPalette.forEach((origColor, idx) => {
          const displayedColor = settings.colorMapping[origColor] || origColor;
          const displayedRgb = hexToRgb(displayedColor);
          const dist = colorDistance(clickedRgb, displayedRgb);
          if (dist < minDistance) {
              minDistance = dist;
              foundIndex = idx;
          }
      });
      
      if (minDistance < 20) {
          setActiveColorIndex(foundIndex);
      }
  };

  const renderPreview = () => {
    const isContour = settings.shape === ShapeType.CONTOUR;
    
    let containerClass = "relative flex items-center justify-center transition-all duration-300 shadow-xl mx-auto ";
    
    if (settings.shape === ShapeType.RECT) {
        containerClass += "w-[340px] h-[210px] "; 
    } else {
        containerClass += "w-[280px] h-[280px] ";
    }

    if (settings.shape === ShapeType.ROUND) containerClass += "rounded-full overflow-hidden ";
    if (settings.shape === ShapeType.SQUARE) containerClass += "rounded-sm overflow-hidden ";
    if (settings.shape === ShapeType.RECT) containerClass += "rounded-lg overflow-hidden ";
    
    const bgStyle: React.CSSProperties = isContour 
      ? { backgroundColor: 'transparent' } 
      : { backgroundColor: settings.baseColor };

    const imgStyle: React.CSSProperties = isContour
      ? { filter: 'url(#contour-effect)', transform: 'scale(0.85)' }
      : { transform: settings.shape === ShapeType.RECT ? 'scale(1)' : 'scale(1.1)' };

    const holeX = settings.holePosition?.x ?? 70;
    const holeY = settings.holePosition?.y ?? -40;
    
    const displayLogo = processedLogo || logo;

    // Wood texture inline style
    const woodBgStyle: React.CSSProperties = {
        backgroundImage: `linear-gradient(rgba(245, 222, 179, 0.7), rgba(210, 180, 140, 0.7)), url('https://www.transparenttextures.com/patterns/wood-pattern.png')`,
        backgroundColor: '#e3c193'
    };

    return (
      <div 
        ref={previewRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="rounded-xl p-8 flex items-center justify-center min-h-[380px] border border-slate-700 relative mb-6 overflow-hidden select-none touch-none shadow-inner"
        style={woodBgStyle}
      >
        <div className="absolute top-2 left-3 text-amber-900/40 text-[10px] font-bold uppercase tracking-widest pointer-events-none">Workspace Canvas</div>
        <div className="absolute bottom-2 right-3 text-amber-900/30 text-[9px] font-mono pointer-events-none italic">Light Oak Finish</div>
        
        <svg className="absolute w-0 h-0">
          <defs>
             <filter id="contour-effect" x="-50%" y="-50%" width="200%" height="200%">
               <feMorphology operator="dilate" radius="6" in="SourceAlpha" result="expanded" />
               <feGaussianBlur in="expanded" stdDeviation="4" result="blurred" />
               <feComponentTransfer in="blurred" result="rounded_silhouette">
                 <feFuncA type="linear" slope="15" intercept="-5" />
               </feComponentTransfer>
               <feFlood floodColor={settings.baseColor} result="flood" />
               <feComposite in="flood" in2="rounded_silhouette" operator="in" result="base_shape" />
               <feMerge>
                 <feMergeNode in="base_shape" />
                 <feMergeNode in="SourceGraphic" />
               </feMerge>
             </filter>
          </defs>
        </svg>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
           <div className="w-2 h-2 rounded-full bg-amber-900"></div>
           <div className="absolute w-full h-[1px] bg-amber-900"></div>
           <div className="absolute h-full w-[1px] bg-amber-900"></div>
        </div>

        <div 
            className={`${containerClass} cursor-crosshair border border-white/10`} 
            style={bgStyle}
            onClick={handlePreviewClick}
        >
          {displayLogo ? (
            <img 
              ref={imgRef}
              src={displayLogo} 
              alt="Preview" 
              className={`object-contain z-10 transition-all duration-300 drop-shadow-md ${
                  settings.shape === ShapeType.RECT 
                    ? 'max-w-[95%] max-h-[95%]' 
                    : 'max-w-[80%] max-h-[80%]'
              }`}
              style={imgStyle}
            />
          ) : (
            <span className="text-amber-900/40 text-xs font-bold uppercase tracking-tighter">Place Logo Here</span>
          )}
        </div>

        <div 
            id="hole-handle"
            onPointerDown={handlePointerDown}
            className="absolute w-6 h-6 bg-slate-900 rounded-full cursor-move z-30 flex items-center justify-center border-2 border-slate-700 shadow-lg group"
            style={{ 
                transform: `translate(${holeX}px, ${holeY}px)`,
            }}
            title="Drag to place hole"
        >
            <div className="w-2 h-2 rounded-full bg-slate-400 group-hover:bg-blue-400 transition-colors"></div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col h-full">
      <h2 className="text-white font-semibold text-lg mb-4 flex items-center justify-between">
        <span className="flex items-center">
            <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-2">2</span>
            Vector Editor
        </span>
      </h2>

      {renderPreview()}

      <div className="space-y-6">
        <div>
            <div className="flex justify-between mb-2">
                <label className="text-slate-400 text-sm font-medium">Max Colors (Segmentation)</label>
                <span className="text-blue-400 text-sm font-bold">{settings.maxColors}</span>
            </div>
            <input 
                type="range" 
                min="2" 
                max="8" 
                step="1"
                value={settings.maxColors}
                onChange={(e) => updateSettings({ maxColors: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
        </div>

        {logo && detectedPalette.length > 0 && (
            <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                <div className="flex justify-between items-end mb-2">
                    <h3 className="text-slate-300 text-sm font-semibold">Edit Palette</h3>
                    <span className="text-[10px] text-slate-500 uppercase tracking-tighter">Click to swap / Eraser to hide</span>
                </div>
                <div className="flex flex-wrap gap-4">
                    {detectedPalette.map((color, idx) => {
                        const isErased = settings.erasedColors.includes(color);
                        const activeColor = settings.colorMapping[color] || color;
                        const isActive = activeColorIndex === idx;
                        
                        return (
                            <div key={idx} className="flex flex-col items-center gap-2">
                                <div className="relative">
                                    <label className={`block relative cursor-pointer group transition-transform ${isActive ? 'scale-110' : ''}`}>
                                        <div 
                                            className={`
                                                w-10 h-10 rounded-full shadow-md border-2 transition-all relative overflow-hidden
                                                ${isActive ? 'border-blue-400 ring-2 ring-blue-500 ring-opacity-50' : 'border-slate-600 group-hover:border-white'}
                                                ${isErased ? 'opacity-20' : ''}
                                            `}
                                            style={{ backgroundColor: activeColor }}
                                        >
                                            {isErased && (
                                                <div className="absolute inset-0" style={{backgroundImage: 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 10px 10px'}}></div>
                                            )}
                                        </div>
                                        <input 
                                            type="color" 
                                            className="absolute opacity-0 inset-0 w-full h-full cursor-pointer"
                                            value={activeColor}
                                            onClick={() => setActiveColorIndex(idx)}
                                            onChange={(e) => handleColorSwap(color, e.target.value)}
                                            disabled={isErased}
                                        />
                                    </label>
                                    <button
                                        onClick={() => toggleEraseColor(color)}
                                        className={`
                                            absolute -bottom-2 -right-2 w-6 h-6 rounded-full border shadow-sm flex items-center justify-center transition-colors
                                            ${isErased 
                                                ? 'bg-red-500 border-red-400 text-white' 
                                                : 'bg-slate-700 border-slate-600 text-slate-400 hover:text-white hover:bg-slate-600'}
                                        `}
                                        title={isErased ? "Restore Color" : "Erase Background/Color"}
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {isErased ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            )}
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}
        
        <div>
          <label className="text-slate-400 text-sm font-medium mb-2 block">Shape Format</label>
          <div className="grid grid-cols-4 gap-2">
            {SHAPES.map((shape) => (
              <button
                key={shape.type}
                onClick={() => updateSettings({ shape: shape.type })}
                className={`
                  flex flex-col items-center justify-center p-2 rounded-lg border transition-all
                  ${settings.shape === shape.type 
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                    : 'border-slate-600 hover:bg-slate-700 text-slate-400'}
                `}
              >
                <div className={`w-6 h-6 mb-1 border-2 border-current ${shape.type === ShapeType.CONTOUR ? 'border-dashed' : ''} ${shape.type === ShapeType.ROUND ? 'rounded-full' : (shape.type === ShapeType.SQUARE ? 'rounded-none' : 'rounded-sm')}`}></div>
                <span className="text-[10px] uppercase font-bold">{shape.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-slate-400 text-sm font-medium">Size (Width)</label>
            <span className="text-blue-400 text-sm font-bold">{settings.size} cm</span>
          </div>
          <input 
            type="range" 
            min="3" 
            max="10" 
            step="0.5"
            value={settings.size}
            onChange={(e) => updateSettings({ size: parseFloat(e.target.value) })}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-slate-400 text-sm font-medium">Base Color</label>
            <span className="text-slate-500 text-xs font-mono uppercase">{settings.baseColor}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {BASE_COLORS.map(color => (
              <button
                key={color}
                onClick={() => updateSettings({ baseColor: color })}
                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${settings.baseColor === color ? 'border-white ring-2 ring-blue-500 ring-offset-1 ring-offset-slate-800' : 'border-transparent'}`}
                style={{ backgroundColor: color }}
              />
            ))}
            <label className="w-8 h-8 rounded-full border-2 border-slate-600 flex items-center justify-center cursor-pointer hover:bg-slate-700">
              <span className="text-slate-400 text-xs">+</span>
              <input 
                type="color" 
                value={settings.baseColor} 
                onChange={(e) => updateSettings({ baseColor: e.target.value })} 
                className="opacity-0 w-0 h-0"
              />
            </label>
          </div>
        </div>

        <button
          onClick={() => onGenerate(processedLogo || undefined)}
          disabled={!logo || isGenerating}
          className={`
            w-full py-3 px-4 rounded-lg font-bold text-white shadow-lg transition-all
            flex items-center justify-center gap-2 mt-4
            ${!logo || isGenerating 
              ? 'bg-slate-600 cursor-not-allowed opacity-50' 
              : 'bg-green-600 hover:bg-green-500 active:transform active:scale-95'}
          `}
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Render...
            </>
          ) : (
            <>
              GENERATE REALISTIC RENDER
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
