import CompanyLayout from "@/components/layout/CompanyLayout";
import { CompanyInfoForm } from "@/components/company/CompanyInfoForm";

const CompanyData = () => {
  return (
    <CompanyLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dados da Empresa</h1>
          <p className="text-muted-foreground mt-2">
            Atualize as informações da empresa
          </p>
        </div>
        
        <CompanyInfoForm />
      </div>
    </CompanyLayout>
  );
};

export default CompanyData;
