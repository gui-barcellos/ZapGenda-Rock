import { useCompanyData } from "@/hooks/useCompanyData";

export function Footer() {
  const { companyData } = useCompanyData();
  const primaryColor = companyData?.primary_color || "#6366f1";

  return (
    <footer className="border-t py-3 px-6 text-center text-xs text-muted-foreground">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-center gap-1.5">
          <span>Desenvolvido com</span>
          <span style={{ color: primaryColor }} className="text-base">♥</span>
          <span>por Marca Pra Mim</span>
        </div>
        <div>
          2025 - © Todos os direitos reservados
        </div>
      </div>
    </footer>
  );
}
