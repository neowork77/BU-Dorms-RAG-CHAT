import { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

interface CropModalProps {
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob) => void;
}

// Helper to create image
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

// Helper to get cropped image
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return null;
  }

  // set canvas size to match the bounding box
  // Resize logic: if cropped area is too large, limit it to max 512x512
  const MAX_SIZE = 512;
  let width = pixelCrop.width;
  let height = pixelCrop.height;

  if (width > MAX_SIZE || height > MAX_SIZE) {
    if (width > height) {
      height = Math.round((height * MAX_SIZE) / width);
      width = MAX_SIZE;
    } else {
      width = Math.round((width * MAX_SIZE) / height);
      height = MAX_SIZE;
    }
  }

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    width,
    height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas is empty"));
        return;
      }
      resolve(blob);
    }, "image/webp", 0.8);
  });
}

export function CropModal({ imageSrc, onClose, onCropComplete }: CropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  useEffect(() => {
    // Lock scroll when modal is open
    document.body.style.overflow = "hidden";
    const mainEl = document.querySelector("main");
    if (mainEl) mainEl.style.overflow = "hidden";
    
    return () => {
      document.body.style.overflow = "";
      if (mainEl) mainEl.style.overflow = "";
    };
  }, []);

  const handleCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setIsCropping(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedBlob) {
        onCropComplete(croppedBlob);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCropping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] p-6 w-full max-w-md border border-surface-container-low flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-on-surface">Crop Avatar</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        
        <div className="relative w-full h-[300px] bg-surface-container rounded-lg overflow-hidden touch-none border border-surface-container-low">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={handleCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[12px] font-semibold uppercase text-on-surface-variant tracking-[0.05em] font-[family-name:var(--font-lexend)]">Zoom</label>
            <span className="text-xs text-on-surface-variant font-medium">{Math.round(zoom * 100)}%</span>
          </div>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.05}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-surface-container-low">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors font-medium text-sm cursor-pointer"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            disabled={isCropping}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity font-medium text-sm shadow-sm active:scale-95 disabled:opacity-70 disabled:active:scale-100 cursor-pointer disabled:cursor-not-allowed min-w-[120px]"
          >
            {isCropping ? (
              <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
            ) : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
