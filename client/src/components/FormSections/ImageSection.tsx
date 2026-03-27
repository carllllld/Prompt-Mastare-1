import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";

interface ImageSectionProps {
  uploadedImages: string[];
  onImagesAdded: (files: File[]) => void;
  onImageRemoved: (index: number) => void;
  imageUploadProgress: { current: number; total: number } | null;
  onFromHemnet?: () => void;
}

export function ImageSection({
  uploadedImages,
  onImagesAdded,
  onImageRemoved,
  imageUploadProgress,
  onFromHemnet,
}: ImageSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files || []);
    if (files.length > 0) {
      onImagesAdded(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("bg-slate-100", "border-slate-400");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("bg-slate-100", "border-slate-400");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("bg-slate-100", "border-slate-400");
    const files = Array.from(e.dataTransfer.files || []);
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length > 0) {
      onImagesAdded(imageFiles);
    }
  };

  return (
    <div className="pro-section-card border-l-4" style={{ borderLeftColor: "#D1D5DB" }}>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Objektbilder</span>
          <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600">
            {uploadedImages.length}/20
          </span>
        </div>
        <p className="text-xs text-muted-foreground">Bilder hjälper AI att förstå objektet bättre och skapa mer relevanta beskrivningar</p>
      </div>

      {/* Upload area */}
      <div
        className="mb-4 p-6 border-2 border-dashed border-slate-300 bg-slate-50 transition-colors cursor-pointer hover:border-slate-400 hover:bg-slate-100"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center gap-2">
          <Upload className="w-6 h-6 text-slate-600" />
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-900">Dra bilder här eller klicka för att välja</p>
            <p className="text-xs text-slate-700 mt-1">Max 20 bilder, upp till 10 MB vardera</p>
          </div>
        </div>
      </div>

      {/* Upload progress */}
      {imageUploadProgress && (
        <div className="mb-4 p-3 bg-slate-50 border border-slate-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700">Laddar upp bilder...</span>
            <span className="text-xs font-bold text-slate-600">
              {imageUploadProgress.current}/{imageUploadProgress.total}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-300 overflow-hidden">
            <div
              className="h-full bg-slate-600 transition-all duration-300"
              style={{ width: `${(imageUploadProgress.current / imageUploadProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mb-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 text-xs"
        >
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          Ladda upp bilder
        </Button>
        {onFromHemnet && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onFromHemnet}
            className="flex-1 text-xs"
          >
            Från Hemnet
          </Button>
        )}
      </div>

      {/* Image gallery */}
      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {uploadedImages.map((image, idx) => (
            <div key={idx} className="relative group">
              <img
                src={image}
                alt={`Bild ${idx + 1}`}
                className="w-full h-20 object-cover border border-slate-300"
              />
              <button
                type="button"
                onClick={() => onImageRemoved(idx)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
              <span className="absolute bottom-1 right-1 text-xs font-bold bg-black/50 text-white px-1.5 py-0.5">
                {idx + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {uploadedImages.length === 0 && !imageUploadProgress && (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">Inga bilder uppladdade än</p>
        </div>
      )}
    </div>
  );
}
