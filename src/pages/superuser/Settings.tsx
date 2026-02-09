import SuperUserLayout from "@/components/layout/SuperUserLayout";
import { OpenAIKeySettings } from "@/components/settings/OpenAIKeySettings";
import { ResendKeySettings } from "@/components/settings/ResendKeySettings";
import { StripeKeySettings } from "@/components/settings/StripeKeySettings";
import { SupabaseSettings } from "@/components/settings/SupabaseSettings";
import { ZAPIClientTokenSettings } from "@/components/settings/ZAPIClientTokenSettings";

const Settings = () => {
  return (
    <SuperUserLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground mt-2">
            Configure as opções gerais do sistema
          </p>
        </div>

        <OpenAIKeySettings />
        <ResendKeySettings />
        <StripeKeySettings />
        <SupabaseSettings />
        <ZAPIClientTokenSettings />
      </div>
    </SuperUserLayout>
  );
};

export default Settings;
