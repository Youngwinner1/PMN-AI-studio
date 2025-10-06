import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  disabled: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, disabled }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement | HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  // FIX: Broaden the event type to be compatible with HTMLLabelElement for the onDrop handler.
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement | HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImageUpload(e.dataTransfer.files[0]);
    }
  }, [onImageUpload]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onImageUpload(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <label
        htmlFor="dropzone-file"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300 ${
          disabled ? 'cursor-not-allowed bg-gray-800 border-gray-700' : 
          dragActive ? 'border-indigo-400 bg-gray-700' : 'border-gray-600 bg-gray-700 hover:bg-gray-600 hover:border-gray-500'
        }`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-gray-400">
          <UploadIcon className="w-10 h-10 mb-4" />
          <p className="mb-2 text-sm"><span className="font-semibold">Cliquez pour téléverser</span> ou glissez-déposez</p>
          <p className="text-xs">PNG, JPG, ou WEBP</p>
        </div>
        <input 
          id="dropzone-file" 
          type="file" 
          className="hidden" 
          accept="image/png, image/jpeg, image/webp"
          onChange={handleChange}
          disabled={disabled} 
        />
      </label>
    </div>
  );
};

export default ImageUploader;