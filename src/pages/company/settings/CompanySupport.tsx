import CompanyLayout from "@/components/layout/CompanyLayout";
import { SupportTicketForm } from "@/components/support/SupportTicketForm";
import { CompanySupportTickets } from "@/components/support/CompanySupportTickets";

const CompanySupport = () => {
  return (
    <CompanyLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Suporte Técnico</h1>
            <p className="text-muted-foreground mt-2">
              Entre em contato com o suporte
            </p>
          </div>
          <SupportTicketForm />
        </div>

        <CompanySupportTickets />
      </div>
    </CompanyLayout>
  );
};

export default CompanySupport;
