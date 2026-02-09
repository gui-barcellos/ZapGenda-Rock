import { useState, useRef } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LogoUploadZoneProps {
  currentLogoUrl?: string | null;
  selectedFile?: File | null;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
}

export function LogoUploadZone({ 
  currentLogoUrl, 
  selectedFile,
  onFileSelect, 
  onRemove 
}: LogoUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      onFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Se tem logo atual e não tem arquivo selecionado, mostra a logo atual
  if (currentLogoUrl && !selectedFile) {
    return (
      <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/20">
        <img src={currentLogoUrl} alt="Logo" className="h-20 w-20 object-contain rounded" />
        <div className="flex-1">
          <p className="text-sm font-medium">Logo atual</p>
          <p className="text-xs text-muted-foreground">Clique em "Selecionar arquivo" para alterar</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onRemove}>
          <X className="h-4 w-4 mr-2" />
          Remover
        </Button>
      </div>
    );
  }

  // Se tem arquivo selecionado, mostra preview
  if (selectedFile) {
    const previewUrl = URL.createObjectURL(selectedFile);
    return (
      <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/20">
        <img src={previewUrl} alt="Preview" className="h-20 w-20 object-contain rounded" />
        <div className="flex-1">
          <p className="text-sm font-medium">{selectedFile.name}</p>
          <p className="text-xs text-muted-foreground">
            {(selectedFile.size / 1024).toFixed(0)} KB
          </p>
        </div>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={() => fileInputRef.current && (fileInputRef.current.value = '')}
        >
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
      </div>
    );
  }

  // Área de upload vazia
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
      />
      
      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      
      <div className="space-y-2">
        <p className="text-sm font-medium">
          Arraste e solte ou clique para selecionar
        </p>
        <p className="text-xs text-muted-foreground">
          PNG, JPG ou WEBP (max. 5MB)
        </p>
      </div>
      
      <Button type="button" variant="outline" size="sm" className="mt-4">
        Selecionar arquivo
      </Button>
    </div>
  );
}
