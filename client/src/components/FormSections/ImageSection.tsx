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
    <div className="bg-white border rounded-lg p-4" style={{ borderColor: "#E8E5DE" }}>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold" style={{ color: "#1D2939" }}>Objektbilder</span>
          <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: "#F3F4F6", color: "#6B7280" }}>
            {uploadedImages.length}/20
          </span>
        </div>
        <p className="text-xs" style={{ color: "#6B7280" }}>Bilder hjälper AI att förstå objektet bättre och skapa mer relevanta beskrivningar</p>
      </div>

      {/* Upload area - elegant design */}
      <div
        className="mb-4 p-6 border-2 border-dashed rounded-lg transition-colors cursor-pointer"
        style={{ 
          borderColor: "#E8E5DE",
          background: "#FAFAF8"
        }}
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
          <Upload className="w-6 h-6" style={{ color: "#6B7280" }} />
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: "#1D2939" }}>Dra bilder här eller klicka för att välja</p>
            <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>Max 20 bilder, upp till 10 MB vardera</p>
          </div>
        </div>
      </div>

      {/* Upload progress - elegant */}
      {imageUploadProgress && (
        <div className="mb-4 p-3 rounded-lg border" style={{ background: "#F8F6F1", borderColor: "#E8E5DE" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: "#4B5563" }}>Laddar upp bilder...</span>
            <span className="text-xs font-semibold" style={{ color: "#2D6A4F" }}>
              {imageUploadProgress.current}/{imageUploadProgress.total}
            </span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#E8E5DE" }}>
            <div
              className="h-full transition-all duration-300"
              style={{ 
                width: `${(imageUploadProgress.current / imageUploadProgress.total) * 100}%`,
                background: "#2D6A4F"
              }}
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

      {/* Image gallery - cleaner design */}
      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {uploadedImages.map((image, idx) => (
            <div key={idx} className="relative group">
              <img
                src={image}
                alt={`Bild ${idx + 1}`}
                className="w-full h-20 object-cover rounded border"
                style={{ borderColor: "#E8E5DE" }}
              />
              <button
                type="button"
                onClick={() => onImageRemoved(idx)}
                className="absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "#DC2626", color: "#fff" }}
              >
                <X className="w-3 h-3" />
              </button>
              <span className="absolute bottom-1 right-1 text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>
                {idx + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {uploadedImages.length === 0 && !imageUploadProgress && (
        <div className="text-center py-4">
          <p className="text-xs" style={{ color: "#9CA3AF" }}>Inga bilder uppladdade än</p>
        </div>
      )}
    </div>
  );
}
