import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, X, Crop, ZoomIn, ZoomOut, Check, Loader2, ImageIcon, Trash2, Link as LinkIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactCrop, { type Crop as CropType, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  validateImageFile,
  getImageInfo,
  processImage,
  formatFileSize,
  type ImageInfo,
} from "@/lib/imageUtils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  currentImageUrl?: string | null;
  onImageUploaded: (urls: { thumbnail: string; medium: string; large: string; original: string } | string) => void;
  onImageRemoved: () => void;
  recommendedSize?: string;
  aspectRatio?: number;
  storagePath?: string;
}

export function ImageUpload({ 
  currentImageUrl, 
  onImageUploaded, 
  onImageRemoved,
  recommendedSize = "800 x 800 px",
  aspectRatio = 1,
  storagePath = "produtos"
}: Props) {
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
  
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState(false);

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

  const handleUrlSubmit = () => {
    if (!urlInput) return;
    // Basic validation
    if (!urlInput.startsWith("http")) {
      setUrlError(true);
      toast.error("URL inválida");
      return;
    }
    setUrlError(false);
    onImageUploaded(urlInput);
    toast.success("URL da imagem aplicada!");
  };

  const openCropper = () => {
    if (!preview) return;
    setCropSrc(preview);
    setCropDialogOpen(true);
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
    const c = centerCrop(
      makeAspectCrop({ unit: "%", width: 90 }, aspectRatio, width, height),
      width,
      height
    );
    setCrop(c);
  }, [aspectRatio]);

  const applyCrop = async () => {
    if (!imgRef.current || !crop) return;

    const image = imgRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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

    canvas.toBlob((blob) => {
      if (blob) {
        setImageInfo((prev) =>
          prev ? { ...prev, width: canvas.width, height: canvas.height, size: blob.size } : prev
        );
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
      const basePath = `${empresaId}/${storagePath}/${timestamp}`;

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

      urls.original = urls.large;

      onImageUploaded(urls as any);
      // Clear preview after successful upload
      setPreview(null);
      setSelectedFile(null);
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
    setUrlInput("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onImageRemoved();
  };

  const displayImage = preview || currentImageUrl;

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      {displayImage ? (
        <div className="space-y-4">
          <div className="relative group max-w-[280px] mx-auto">
            <div 
              className="relative overflow-hidden rounded-xl border bg-muted shadow-sm transition-all group-hover:shadow-md"
              style={{ aspectRatio: aspectRatio > 2 ? "21/9" : aspectRatio === 1 ? "1/1" : "16/9" }}
            >
              <img
                src={displayImage}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={() => {
                  if (displayImage.startsWith("http")) {
                    setUrlError(true);
                  }
                }}
              />
              {urlError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 backdrop-blur-sm text-destructive gap-2 text-center p-4">
                  <AlertCircle className="w-8 h-8" />
                  <p className="text-xs font-bold">Erro ao carregar imagem da URL</p>
                </div>
              )}
              <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {preview && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 rounded-full shadow-lg"
                    onClick={openCropper}
                  >
                    <Crop className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8 rounded-full shadow-lg"
                  onClick={handleRemove}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Overlay Recommendation Label */}
            <div className="mt-2 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Recomendado</span>
                <p className="text-xs font-medium">{recommendedSize}</p>
              </div>
              {imageInfo && (
                <div className="text-right space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Arquivo Atual</span>
                  <p className="text-xs font-medium">{imageInfo.width} × {imageInfo.height} px • {formatFileSize(imageInfo.size)}</p>
                </div>
              )}
            </div>
          </div>

          {preview && (
            <Button
              type="button"
              className="w-full"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Enviando para o servidor...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Confirmar Upload
                </>
              )}
            </Button>
          )}
        </div>
      ) : (
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="w-3.5 h-3.5" /> Upload
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-2">
              <LinkIcon className="w-3.5 h-3.5" /> URL
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 rounded-xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ImageIcon className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">Clique para subir arquivo</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Ideal: {recommendedSize} • JPG, PNG, WEBP
                </p>
              </div>
            </button>
          </TabsContent>
          
          <TabsContent value="url" className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Cole a URL da imagem pública</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="https://exemplo.com/imagem.jpg" 
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="flex-1"
                />
                <Button type="button" size="icon" onClick={handleUrlSubmit}>
                  <Check className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Certifique-se de que a imagem está em um servidor público (ex: Cloudinary, Imgur, ou seu próprio site).
              </p>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Recortar Imagem</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto bg-black/5 rounded-lg border">
            {cropSrc && (
              <ReactCrop
                crop={crop}
                onChange={(_, c) => setCrop(c)}
                aspect={aspectRatio}
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
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setCropDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={applyCrop} className="gap-2">
              <Check className="w-4 h-4" />
              Aplicar Corte
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
