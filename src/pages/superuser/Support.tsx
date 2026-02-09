import SuperUserLayout from "@/components/layout/SuperUserLayout";
import { SuperUserSupportTable } from "@/components/support/SuperUserSupportTable";

const Support = () => {
  return (
    <SuperUserLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suporte Técnico</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie tickets de suporte das empresas
          </p>
        </div>

        <SuperUserSupportTable />
      </div>
    </SuperUserLayout>
  );
};

export default Support;
