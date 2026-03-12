import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, X, Crop, ZoomIn, ZoomOut, Check, Loader2, ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactCrop, { type Crop as CropType, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  validateImageFile,
  getImageInfo,
  processImage,
  processImageFromCanvas,
  formatFileSize,
  type ProcessedImages,
  type ImageInfo,
} from "@/lib/imageUtils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  currentImageUrl?: string | null;
  onImageUploaded: (urls: { thumbnail: string; medium: string; large: string; original: string }) => void;
  onImageRemoved: () => void;
}

export function ImageUpload({ currentImageUrl, onImageUploaded, onImageRemoved }: Props) {
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string>("");
  const [crop, setCrop] = useState<CropType>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    const info = await getImageInfo(file);
    setImageInfo(info);
    setSelectedFile(file);

    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const openCropper = () => {
    if (!preview) return;
    setCropSrc(preview);
    setCropDialogOpen(true);
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
    const c = centerCrop(
      makeAspectCrop({ unit: "%", width: 90 }, 1, width, height),
      width,
      height
    );
    setCrop(c);
  }, []);

  const applyCrop = async () => {
    if (!imgRef.current || !crop) return;

    const image = imgRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const pixelCrop = {
      x: (crop.x / 100) * image.naturalWidth,
      y: (crop.y / 100) * image.naturalHeight,
      width: (crop.width / 100) * image.naturalWidth,
      height: (crop.height / 100) * image.naturalHeight,
    };

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    const dataUrl = canvas.toDataURL("image/png");
    setPreview(dataUrl);

    // Update info
    canvas.toBlob((blob) => {
      if (blob) {
        setImageInfo((prev) =>
          prev ? { ...prev, width: canvas.width, height: canvas.height, size: blob.size } : prev
        );
        // Create a new file from the cropped blob
        const croppedFile = new File([blob], "cropped.png", { type: "image/png" });
        setSelectedFile(croppedFile);
      }
    });

    setCropDialogOpen(false);
  };

  const handleUpload = async () => {
    if (!selectedFile || !profile) return;

    setUploading(true);
    try {
      const processed = await processImage(selectedFile);

      const empresaId = profile.empresa_id;
      const timestamp = Date.now();
      const basePath = `${empresaId}/produtos/${timestamp}`;

      const urls: Record<string, string> = {};

      for (const [key, version] of Object.entries(processed) as [string, any][]) {
        const filePath = `${basePath}/${key}.webp`;
        const { error } = await supabase.storage
          .from("catalogo")
          .upload(filePath, version.blob, {
            contentType: "image/webp",
            upsert: true,
          });
        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from("catalogo")
          .getPublicUrl(filePath);
        urls[key] = urlData.publicUrl;
      }

      // Upload original as large fallback
      urls.original = urls.large;

      onImageUploaded(urls as any);
      toast.success("Imagem enviada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao enviar imagem: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setImageInfo(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onImageRemoved();
  };

  const displayImage = preview || currentImageUrl;

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      {displayImage ? (
        <div className="space-y-3">
          {/* Preview */}
          <div className="relative aspect-square w-full max-w-[200px] rounded-xl overflow-hidden border bg-muted">
            <img
              src={displayImage}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2 flex gap-1">
              {preview && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm"
                  onClick={openCropper}
                >
                  <Crop className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm"
                onClick={handleRemove}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Image info */}
          {imageInfo && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>{imageInfo.width} × {imageInfo.height}px</p>
              <p>{formatFileSize(imageInfo.size)}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Alterar
            </Button>
            {preview && (
              <Button
                type="button"
                size="sm"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Enviar
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full max-w-[200px] aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-accent/50 transition-colors cursor-pointer"
        >
          <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
          <span className="text-xs text-muted-foreground">Clique para adicionar</span>
          <span className="text-[10px] text-muted-foreground/70">JPG, PNG, WEBP • Máx 5MB</span>
        </button>
      )}

      {/* Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Recortar Imagem</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            {cropSrc && (
              <ReactCrop
                crop={crop}
                onChange={(_, c) => setCrop(c)}
                aspect={1}
              >
                <img
                  ref={imgRef}
                  src={cropSrc}
                  alt="Crop"
                  onLoad={onImageLoad}
                  className="max-w-full"
                />
              </ReactCrop>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCropDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={applyCrop}>
              <Check className="w-4 h-4 mr-1.5" />
              Aplicar Corte
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
