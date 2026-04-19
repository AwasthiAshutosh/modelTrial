import React, { useRef, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { motion } from 'framer-motion';

const FileUpload = ({ file, setFile, preview, setPreview }) => {
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (preview) URL.revokeObjectURL(preview);
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const clearFile = (e) => {
    e.stopPropagation();
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
  };

  return (
    <div 
      onClick={() => !file && fileInputRef.current.click()}
      className={`relative w-full h-80 rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden
        ${file ? 'border-transparent' : 'border-slate-700 hover:border-blue-500 hover:bg-white/5'} glass`}
    >
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange}
        accept="image/*"
      />
      
      {preview ? (
        <div className="relative w-full h-full">
          <img src={preview} alt="Upload preview" className="w-full h-full object-cover" />
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={clearFile}
            className="absolute top-4 right-4 p-2 bg-red-500/20 backdrop-blur-md rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </motion.button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-slate-400 p-8 text-center">
          <div className="p-4 bg-premium-accent/10 rounded-full text-premium-accent">
            <Upload size={32} />
          </div>
          <div>
            <p className="text-white font-medium text-lg">Upload an image of your room</p>
            <p className="text-sm">Drag and drop or click to browse</p>
          </div>
          <p className="text-xs text-slate-500 max-w-xs">
            Supports JPG, PNG, WEBP. Max size 10MB. For best results, use well-lit photos.
          </p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
