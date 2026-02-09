import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ColorPreviewProps {
  color: string;
}

export function ColorPreview({ color }: ColorPreviewProps) {
  return (
    <div className="space-y-2">
      <Label>Prévia</Label>
      <div className="border rounded-lg p-6 bg-muted/20">
        <div className="flex gap-2 mb-4">
          <Button style={{ backgroundColor: color, color: '#ffffff' }}>Menu ativo</Button>
          <Button variant="outline" disabled>Menu inativo</Button>
        </div>
        <p className="text-xs text-center text-muted-foreground">
          Desenvolvido com <span style={{ color }}>♥</span> por Marca Pra Mim
        </p>
      </div>
    </div>
  );
}
