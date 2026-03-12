/**
 * Client-side image processing: resize, compress, convert to WebP
 */

export interface ImageVersion {
  blob: Blob;
  width: number;
  height: number;
  size: number;
  name: string;
}

export interface ProcessedImages {
  thumbnail: ImageVersion;  // 300x300
  medium: ImageVersion;     // 600x600
  large: ImageVersion;      // 1200x1200
}

export interface ImageInfo {
  width: number;
  height: number;
  size: number;
  type: string;
  name: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const BLOCKED_EXTENSIONS = [".exe", ".bat", ".cmd", ".sh", ".ps1", ".js", ".php"];

export function validateImageFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 5MB`;
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Formato não permitido. Use JPG, PNG ou WEBP";
  }

  const ext = file.name.toLowerCase();
  if (BLOCKED_EXTENSIONS.some((e) => ext.endsWith(e))) {
    return "Tipo de arquivo bloqueado";
  }

  return null;
}

export function getImageInfo(file: File): Promise<ImageInfo> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        size: file.size,
        type: file.type,
        name: file.name,
      });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0, size: file.size, type: file.type, name: file.name });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

function resizeImage(
  img: HTMLImageElement,
  maxSize: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Canvas not supported"));

    let { naturalWidth: w, naturalHeight: h } = img;

    // Maintain aspect ratio
    if (w > maxSize || h > maxSize) {
      if (w > h) {
        h = Math.round((h / w) * maxSize);
        w = maxSize;
      } else {
        w = Math.round((w / h) * maxSize);
        h = maxSize;
      }
    }

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);

    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      },
      "image/webp",
      quality
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function processImage(file: File): Promise<ProcessedImages> {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);

  const sizes = [
    { name: "thumbnail", max: 300, quality: 0.75 },
    { name: "medium", max: 600, quality: 0.8 },
    { name: "large", max: 1200, quality: 0.85 },
  ] as const;

  const results: Record<string, ImageVersion> = {};

  for (const s of sizes) {
    const blob = await resizeImage(img, s.max, s.quality);
    const resizedImg = await loadImage(URL.createObjectURL(blob));
    results[s.name] = {
      blob,
      width: resizedImg.naturalWidth,
      height: resizedImg.naturalHeight,
      size: blob.size,
      name: s.name,
    };
  }

  URL.revokeObjectURL(url);

  return results as unknown as ProcessedImages;
}

export async function processImageFromCanvas(
  canvas: HTMLCanvasElement
): Promise<ProcessedImages> {
  const dataUrl = canvas.toDataURL("image/png");
  const img = await loadImage(dataUrl);

  const sizes = [
    { name: "thumbnail", max: 300, quality: 0.75 },
    { name: "medium", max: 600, quality: 0.8 },
    { name: "large", max: 1200, quality: 0.85 },
  ] as const;

  const results: Record<string, ImageVersion> = {};

  for (const s of sizes) {
    const blob = await resizeImage(img, s.max, s.quality);
    const resizedImg = await loadImage(URL.createObjectURL(blob));
    results[s.name] = {
      blob,
      width: resizedImg.naturalWidth,
      height: resizedImg.naturalHeight,
      size: blob.size,
      name: s.name,
    };
  }

  return results as unknown as ProcessedImages;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
