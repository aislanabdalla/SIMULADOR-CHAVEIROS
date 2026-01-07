import React, { useRef } from 'react';

interface UploadCardProps {
  logo: string | null;
  onUpload: (fileData: string) => void;
}

export const UploadCard: React.FC<UploadCardProps> = ({ logo, onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onUpload(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col h-full">
      <h2 className="text-white font-semibold text-lg mb-4">1. Upload Logo</h2>
      
      <div 
        onClick={handleClick}
        className={`
          flex-grow flex flex-col items-center justify-center 
          border-2 border-dashed rounded-lg cursor-pointer transition-colors
          min-h-[160px] relative overflow-hidden group
          ${logo ? 'border-blue-500 bg-slate-900' : 'border-slate-600 hover:border-blue-400 hover:bg-slate-700'}
        `}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
        
        {logo ? (
          <>
            <img 
              src={logo} 
              alt="Uploaded Logo" 
              className="max-w-[80%] max-h-[120px] object-contain z-10"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
               <span className="text-white text-sm font-medium">Click to replace</span>
            </div>
          </>
        ) : (
          <div className="text-center p-4">
             <svg className="w-10 h-10 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
             </svg>
             <p className="text-slate-300 text-sm">Click to upload SVG or PNG</p>
          </div>
        )}
      </div>
    </div>
  );
};