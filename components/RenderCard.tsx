
import React from 'react';

interface RenderCardProps {
  generatedImage: string | null;
  isGenerating: boolean;
  onDownloadSvg: () => void;
  onDownloadRender: () => void;
  onApprove: (image: string) => void;
  isApproved: boolean;
  referenceCount: number;
}

export const RenderCard: React.FC<RenderCardProps> = ({ 
  generatedImage, 
  isGenerating,
  onDownloadSvg,
  onDownloadRender,
  onApprove,
  isApproved,
  referenceCount
}) => {
  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold text-lg flex items-center">
          <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-2">3</span>
          Realistic Render
        </h2>
        {referenceCount > 0 && (
          <div className="flex items-center gap-1.5 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/30">
             <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
             <span className="text-[10px] text-blue-400 font-bold uppercase">{referenceCount} Active Refs</span>
          </div>
        )}
      </div>

      <div className="w-full aspect-square bg-slate-900 rounded-xl border border-slate-700 overflow-hidden relative flex items-center justify-center mb-6">
        {generatedImage ? (
           <>
            <img 
              src={generatedImage} 
              alt="AI Generated Render" 
              className="w-full h-full object-contain animate-in fade-in duration-500"
            />
            <button 
              onClick={() => onApprove(generatedImage)}
              className={`
                absolute top-3 right-3 p-2 rounded-full shadow-lg transition-all border
                ${isApproved 
                  ? 'bg-blue-600 border-blue-400 text-white scale-110' 
                  : 'bg-black/60 border-white/20 text-white/70 hover:bg-black/80 hover:text-white'}
              `}
              title={isApproved ? "Approved Style" : "Approve this style for future renders"}
            >
              <svg className="w-5 h-5" fill={isApproved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
           </>
        ) : (
          <div className="text-center p-8">
            {isGenerating ? (
               <div className="flex flex-col items-center">
                 <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                 <p className="text-slate-400 text-sm animate-pulse font-medium">Applying manufacturing rules...</p>
                 {referenceCount > 0 && <p className="text-blue-500 text-[10px] mt-2 font-bold uppercase">Matching previous style</p>}
               </div>
            ) : (
              <>
                 <svg className="w-16 h-16 text-slate-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                 </svg>
                 <p className="text-slate-500 text-sm">Render will appear here</p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3 mt-auto">
        <button 
          onClick={() => generatedImage && onApprove(generatedImage)}
          disabled={!generatedImage || isApproved}
          className={`
            w-full py-2.5 px-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest
            ${isApproved 
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 cursor-default' 
                : generatedImage 
                  ? 'bg-blue-600 text-white hover:bg-blue-500' 
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'}
          `}
        >
          {isApproved ? '✓ Style Approved as Reference' : 'Approve Style & Context'}
        </button>
        
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={onDownloadSvg}
            className="py-3 px-4 rounded-lg font-bold text-white bg-slate-700 hover:bg-slate-600 transition-colors uppercase text-[10px] tracking-wide"
          >
            SVG Setup
          </button>
          <button 
            onClick={onDownloadRender}
            disabled={!generatedImage}
            className={`
              py-3 px-4 rounded-lg font-bold text-white uppercase text-[10px] tracking-wide transition-colors
              ${generatedImage 
                ? 'bg-green-600 hover:bg-green-500' 
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
            `}
          >
            Download Render
          </button>
        </div>
      </div>
    </div>
  );
};
