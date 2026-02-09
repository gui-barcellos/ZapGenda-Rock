import CompanyLayout from "@/components/layout/CompanyLayout";
import { VisualCustomizationForm } from "@/components/company/VisualCustomizationForm";

const Visual = () => {
  return (
    <CompanyLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personalização Visual</h1>
          <p className="text-muted-foreground mt-2">
            Personalize a aparência do sistema
          </p>
        </div>

        <VisualCustomizationForm />
      </div>
    </CompanyLayout>
  );
};

export default Visual;
