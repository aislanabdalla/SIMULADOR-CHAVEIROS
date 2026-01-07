
import React, { useState } from 'react';
import { UploadCard } from './components/UploadCard';
import { EditorCard } from './components/EditorCard';
import { RenderCard } from './components/RenderCard';
import { AppState, PrintSettings, ShapeType } from './types';
import { generateKeyringRender } from './services/geminiService';

const INITIAL_SETTINGS: PrintSettings = {
  shape: ShapeType.CONTOUR,
  size: 6.0,
  baseColor: '#000000',
  palette: ['#ffffff', '#ff0000', '#000000'],
  maxColors: 4,
  holePosition: { x: 70, y: -40 }, 
  colorMapping: {},
  erasedColors: [],
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    logo: null,
    settings: INITIAL_SETTINGS,
    generatedImage: null,
    isGenerating: false,
    error: null,
    approvedReferences: []
  });

  const handleUpload = (logoData: string) => {
    setState(prev => ({ 
      ...prev, 
      logo: logoData, 
      generatedImage: null,
      settings: { ...prev.settings, colorMapping: {}, erasedColors: [] } 
    }));
  };

  const updateSettings = (newSettings: Partial<PrintSettings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings }
    }));
  };

  const handleGenerate = async (processedImage?: string) => {
    const imageToUse = processedImage || state.logo;
    if (!imageToUse) return;

    setState(prev => ({ ...prev, isGenerating: true, error: null }));

    try {
      const generatedImage = await generateKeyringRender(
        imageToUse, 
        state.settings, 
        state.approvedReferences
      );
      setState(prev => ({ ...prev, generatedImage, isGenerating: false }));
    } catch (error) {
      console.error(error);
      setState(prev => ({ 
        ...prev, 
        isGenerating: false, 
        error: "Failed to generate image." 
      }));
    }
  };

  const handleApprove = (image: string) => {
    if (state.approvedReferences.includes(image)) return;
    setState(prev => ({
      ...prev,
      approvedReferences: [...prev.approvedReferences, image]
    }));
  };

  const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSvg = () => {
    alert("Exporting vectorized G-Code compatible pathing...");
  };

  const handleDownloadRender = () => {
    if (state.generatedImage) {
      downloadImage(state.generatedImage, `keyring-${Date.now()}.png`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8 flex flex-col">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-500/30">
            S
          </div>
          <div>
            <h1 className="text-white font-bold text-xl leading-tight">SIMULADOR DE CHAVEIROS</h1>
            <p className="text-slate-400 text-[10px] font-bold tracking-[0.2em] uppercase">Manufacturing Simulation</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4">
            <div className="flex flex-col items-end">
                <span className="text-slate-500 text-[10px] font-bold uppercase">Processing Engine</span>
                <span className="text-blue-400 text-xs font-mono">Gemini 2.5 Flash Native</span>
            </div>
            <div className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center bg-slate-800">
                 <svg className="w-5 h-5 text-blue-400 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
                </svg>
            </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] mx-auto w-full">
        
        {/* Left Column: Upload & Settings */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="h-64">
            <UploadCard logo={state.logo} onUpload={handleUpload} />
          </div>
          
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex-grow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-blue-400 font-bold flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Print Specs
              </h3>
              <div className="px-2 py-0.5 rounded bg-green-500/10 border border-green-500/30 text-[10px] text-green-400 font-bold uppercase">Optimized</div>
            </div>
            <div className="space-y-4">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1 tracking-wider">Surface Mode</p>
                <p className="text-white text-sm">Face-Down / PEI Textured</p>
              </div>
               <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1 tracking-wider">Layer Resolution</p>
                <p className="text-white text-sm font-mono">0.16mm Fine</p>
              </div>
               <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1 tracking-wider">Nozzle</p>
                <p className="text-white text-sm font-mono">0.4mm (100% Flow)</p>
              </div>
            </div>
            
            {state.approvedReferences.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-700">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-3 tracking-widest">Style references ({state.approvedReferences.length})</p>
                <div className="grid grid-cols-4 gap-2">
                  {state.approvedReferences.slice(-4).map((ref, i) => (
                    <div key={i} className="aspect-square rounded border border-slate-600 overflow-hidden bg-slate-900 group relative">
                       <img src={ref} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="ref" />
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            onClick={() => downloadImage(ref, `reference-${i}.png`)}
                            className="bg-blue-600 p-1.5 rounded-full text-white hover:bg-blue-500 shadow-lg"
                            title="Download reference in high resolution"
                          >
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4-4v12" /></svg>
                          </button>
                       </div>
                       <div className="absolute bottom-0 right-0 p-0.5 bg-blue-500 pointer-events-none">
                          <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Column: Editor */}
        <div className="lg:col-span-5">
          <EditorCard 
            settings={state.settings}
            updateSettings={updateSettings}
            logo={state.logo}
            onGenerate={handleGenerate}
            isGenerating={state.isGenerating}
          />
        </div>

        {/* Right Column: Render */}
        <div className="lg:col-span-4">
           <RenderCard 
             generatedImage={state.generatedImage}
             isGenerating={state.isGenerating}
             onDownloadSvg={handleDownloadSvg}
             onDownloadRender={handleDownloadRender}
             onApprove={handleApprove}
             isApproved={state.generatedImage ? state.approvedReferences.includes(state.generatedImage) : false}
             referenceCount={state.approvedReferences.length}
           />
        </div>

      </main>
    </div>
  );
};

export default App;
