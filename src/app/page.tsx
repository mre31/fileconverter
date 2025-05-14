'use client';

import { useState, ChangeEvent, useEffect, DragEvent } from 'react';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState<string>('png');
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [conversionQuality, setConversionQuality] = useState<number>(0.92);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  const isQualityApplicable = targetFormat === 'jpeg' || targetFormat === 'webp' || targetFormat === 'avif';

  const handleFileSelect = (file: File | null) => {
    setError(null); // Clear previous errors
    if (file) {
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };
  
  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      handleFileSelect(event.target.files[0]);
    } else {
      handleFileSelect(null);
    }
  };

  const handleFormatChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setTargetFormat(event.target.value);
  };

  const handleQualityChange = (event: ChangeEvent<HTMLInputElement>) => {
    setConversionQuality(parseFloat(event.target.value));
  };
  
  useEffect(() => {
  }, [targetFormat, isQualityApplicable]);

  const getClientSideOutputFileName = (originalName: string, targetFormatValue: string): string => {
    const dotIndex = originalName.lastIndexOf('.');
    const nameWithoutExtension = dotIndex === -1 ? originalName : originalName.substring(0, dotIndex);
    if (targetFormatValue.toLowerCase() === 'ico') {
      // The final output will be a ZIP of .ico files
      return `${nameWithoutExtension}-icons.zip`;
    }
    return `${nameWithoutExtension}.${targetFormatValue.toLowerCase()}`;
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Please select a file first!');
      return;
    }

    setIsConverting(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('targetFormat', targetFormat);

    if (isQualityApplicable) {
      formData.append('quality', conversionQuality.toString());
    }

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Server error or non-JSON response.' }));
        throw new Error(errorData.error || `Server error: ${response.status} ${response.statusText}`);
      }

      // Try to get filename from Content-Disposition header
      const disposition = response.headers.get('content-disposition');
      let filename = getClientSideOutputFileName(selectedFile.name, targetFormat); // Default filename
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"])(?<filename_token>.*?)\2|(?<filename_token_no_quotes>[^;\n]*))/i;
        const matches = filenameRegex.exec(disposition);
        if (matches && matches.groups && matches.groups.filename_token) {
          filename = matches.groups.filename_token;
        } else if (matches && matches.groups && matches.groups.filename_token_no_quotes) {
          filename = matches.groups.filename_token_no_quotes;
        } // Basic fallback if regex fails but header exists
        else if (disposition.includes('filename=')) {
          filename = disposition.split('filename=')[1].split(';')[0].replace(/['"]/g, '');
        }
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename; 
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (e: unknown) {
      console.error('Conversion API error:', e);
      let errorMessage = 'An error occurred during file conversion.';
      if (e instanceof Error) {
        errorMessage = e.message;
      }
      setError(errorMessage);
    } finally {
      setIsConverting(false);
    }
  };

  const availableFormats = ['png', 'jpeg', 'webp', 'svg', 'ico', 'avif'];

  return (
    <main 
      className="flex flex-col items-center justify-center min-h-screen p-4"
      style={{ 
        backgroundColor: "var(--background-custom)"
      }}
    >
      <div className="w-full max-w-sm">
        <div className="bg-zinc-800 rounded-lg shadow-xl p-6 w-full mx-auto">
          <h2 className="text-white text-2xl font-bold text-center mb-6 animate-slide-down slide-1">
            File Converter
          </h2>
          
          {error && (
            <div className="animate-fade-in bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
            <div className="animate-slide-down slide-2">
              <label 
                htmlFor="file-input" 
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors block
                            ${isDraggingOver ? 'border-purple-500 scale-[1.03]' : selectedFile ? 'border-green-500/80 hover:border-green-500' : 'border-blue-500/60 hover:border-blue-500'}
                            ${isConverting ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                onDragOver={(e: DragEvent<HTMLLabelElement>) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isConverting) setIsDraggingOver(true);
                }}
                onDragLeave={(e: DragEvent<HTMLLabelElement>) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingOver(false);
                }}
                onDrop={(e: DragEvent<HTMLLabelElement>) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingOver(false);
                  if (isConverting) return;
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    // Check file type (optional, but good practice)
                    const acceptedTypes = [".jpeg",".jpg",".png",".avif",".svg",".ico",".webp"];
                    const fileType = e.dataTransfer.files[0].name.substring(e.dataTransfer.files[0].name.lastIndexOf('.')).toLowerCase();
                    if (acceptedTypes.includes(fileType)) {
                      handleFileSelect(e.dataTransfer.files[0]);
                    } else {
                      setError(`Unsupported file type: ${fileType}. Please choose a supported image.`);
                      handleFileSelect(null);
                    }
                  } else {
                    handleFileSelect(null);
                  }
                }}
              >
                <input 
                  id="file-input" 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileInputChange} 
                  accept=".jpeg,.jpg,.png,.avif,.svg,.ico,.webp"
                  disabled={isConverting}
                />
                <div className="h-12 flex flex-col items-center justify-center">
                  {selectedFile ? (
                    <span className="text-green-400 animate-fade-in text-sm">
                      {selectedFile.name} ({ (selectedFile.size / 1024).toFixed(2) } KB)
                    </span>
                  ) : (
                    <p className="text-zinc-300 animate-fade-in transition-opacity duration-300 ease-in-out">
                      Choose or drag a file to convert
                    </p>
                  )}
                </div>
              </label>
            </div>

            <div className="cursor-pointer animate-slide-down slide-3">
              <label htmlFor="format-select" className="block text-sm font-medium text-zinc-300 mb-1">
                Target Format:
              </label>
              <select 
                id="format-select" 
                value={targetFormat} 
                onChange={handleFormatChange} 
                disabled={isConverting}
                className="w-full bg-zinc-700 border border-zinc-600 text-zinc-200 rounded-md p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
              >
                {availableFormats.map(format => (
                  <option key={format} value={format} className="bg-zinc-700 text-zinc-200">
                    {format.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className={`animate-slide-down slide-3a ${!isQualityApplicable ? 'opacity-60' : ''}`}>
              <label 
                htmlFor="quality-slider" 
                className={`block text-sm font-medium mb-1 ${!isQualityApplicable ? 'text-zinc-500' : 'text-zinc-300'}`}>
                Quality: 
                {isQualityApplicable && 
                  <span className="font-normal text-blue-400"> {(conversionQuality * 100).toFixed(0)}%</span>
                }
                {!isQualityApplicable &&
                  <span className="font-normal text-zinc-500"> (N/A for {targetFormat.toUpperCase()})</span>
                }
              </label>
              <input 
                type="range" 
                id="quality-slider"
                min="0.1" 
                max="1" 
                step="0.01" 
                value={conversionQuality} 
                onChange={handleQualityChange} 
                disabled={isConverting || !isQualityApplicable}
                className="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <button 
              type="submit"
              disabled={!selectedFile || isConverting}
              className="animate-slide-down slide-4 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium disabled:pointer-events-none w-full bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer h-9 px-3 py-2 shadow-lg disabled:bg-zinc-600 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isConverting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Converting...
                </>
              ) : (
                'Convert'
              )}
            </button>
          </form>
        </div>
      </div>
      <footer className="text-center text-zinc-500 text-xs py-4 w-full max-w-sm fixed bottom-0 left-1/2 transform -translate-x-1/2">
        <p>File Converter v1.0.0 <a href="https://github.com/mre31/fileconverter" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-500 transition-colors">GitHub</a></p>
      </footer>
    </main>
  );
}
