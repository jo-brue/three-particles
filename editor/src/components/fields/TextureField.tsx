import { useRef } from 'react';

interface TextureFieldProps {
  label?: string;
  value: { dataUrl: string | null };
  onChange: (value: { dataUrl: string | null }) => void;
}

// Textures here are GPU lookups (noise fields, sprites, gradients) sampled at modest
// resolution - there's no benefit to keeping a multi-megapixel source image, and doing so is
// what blows the localStorage quota the config gets persisted into (see store.ts). Downscale
// before it ever becomes a dataUrl instead of storing the original.
const MAX_DIMENSION = 512;

function downscaleToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image'));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas 2D not supported')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        // PNG, not JPEG - render/sprite textures rely on the alpha channel.
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function TextureField({ label, value, onChange }: TextureFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      onChange({ dataUrl: await downscaleToDataUrl(file) });
    } catch (err) {
      alert(`Could not load image: ${(err as Error).message}`);
    }
  };

  return (
    <div className="field field-texture">
      {label && <label>{label}</label>}
      <div
        className="texture-drop"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); }}
      >
        {value.dataUrl ? (
          <img src={value.dataUrl} alt="" />
        ) : (
          <span className="texture-drop-placeholder">Drop image or click (using shared noise by default)</span>
        )}
      </div>
      <input
        ref={inputRef} type="file" accept="image/*" hidden
        onChange={(e) => loadFile(e.target.files?.[0])}
      />
      {value.dataUrl && (
        <button type="button" className="btn-secondary" onClick={() => onChange({ dataUrl: null })}>Clear</button>
      )}
    </div>
  );
}
