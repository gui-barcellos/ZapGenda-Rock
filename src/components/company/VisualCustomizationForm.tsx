import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCompanyData } from "@/hooks/useCompanyData";
import { ColorPicker } from "./ColorPicker";
import { ColorPreview } from "./ColorPreview";
import { LogoUploadZone } from "./LogoUploadZone";
import { Palette, Upload } from "lucide-react";

export function VisualCustomizationForm() {
  const { companyData, isLoading, updateCompanyData, uploadLogo, removeLogo } = useCompanyData();
  const [color, setColor] = useState("#6366f1");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    if (companyData) {
      setColor(companyData.primary_color || "#6366f1");
    }
  }, [companyData]);

  // Auto-save color changes with debounce
  const handleColorChange = useCallback((newColor: string) => {
    setColor(newColor);
    
    const timer = setTimeout(() => {
      updateCompanyData.mutate({ primary_color: newColor });
    }, 500);

    return () => clearTimeout(timer);
  }, [updateCompanyData]);

  const handleLogoSave = async () => {
    if (logoFile) {
      await uploadLogo.mutateAsync(logoFile);
      setLogoFile(null);
    }
  };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-8">
      {/* Seção 1: Cor de destaque do menu */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Cor de destaque do menu</h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <ColorPicker value={color} onChange={handleColorChange} />
            </div>
            <div>
              <ColorPreview color={color} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção 2: Logo da Clínica */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Logo da Clínica</h2>
          </div>
          
          <LogoUploadZone
            currentLogoUrl={companyData?.logo_url}
            selectedFile={logoFile}
            onFileSelect={setLogoFile}
            onRemove={() => removeLogo.mutate()}
          />

          {logoFile && (
            <Button onClick={handleLogoSave} disabled={uploadLogo.isPending}>
              {uploadLogo.isPending ? "Salvando..." : "Salvar Logo"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
