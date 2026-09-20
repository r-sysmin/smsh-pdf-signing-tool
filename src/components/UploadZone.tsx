
import React from 'react';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
}

const UploadZone = ({ onFileSelected }: UploadZoneProps) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      onFileSelected(acceptedFiles[0]);
    }
  }, [onFileSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false
  });

  return (
    <div
      {...getRootProps()}
      className={`
        w-full p-12 border-2 border-dashed rounded-xl
        transition-all duration-200 ease-in-out
        ${isDragActive 
          ? 'border-gray-900 bg-gray-100/50' 
          : 'border-gray-200 hover:border-gray-900/50 hover:bg-gray-50'
        }
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-900"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900">
            Drop your PDF here, or click to select
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Supports PDF files up to 10MB
          </p>
        </div>
      </div>
    </div>
  );
};

export default UploadZone;
