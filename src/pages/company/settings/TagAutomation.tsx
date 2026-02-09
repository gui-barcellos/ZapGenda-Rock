import { useState } from "react";
import CompanyLayout from "@/components/layout/CompanyLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Zap } from "lucide-react";
import { useAutomationRules, useToggleAutomationRule } from "@/hooks/useTagAutomation";

const TagAutomation = () => {
  const { data: rules, isLoading } = useAutomationRules();
  const toggleRule = useToggleAutomationRule();

  const handleToggle = async (id: string, currentStatus: boolean) => {
    await toggleRule.mutateAsync({ id, isActive: !currentStatus });
  };

  return (
    <CompanyLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Automação de Tags</h1>
            <p className="text-muted-foreground mt-2">
              Configure regras para aplicar tags automaticamente
            </p>
          </div>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Nova Regra
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Regras de Automação</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : rules && rules.length > 0 ? (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Zap className={`h-5 w-5 ${rule.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="flex-1">
                        <h3 className="font-medium">{rule.name}</h3>
                        {rule.description && (
                          <p className="text-sm text-muted-foreground">{rule.description}</p>
                        )}
                        <div className="flex gap-2 mt-2">
                          {rule.tags_to_add?.map((tag) => (
                            <Badge key={tag} variant="secondary">+{tag}</Badge>
                          ))}
                          {rule.tags_to_remove?.map((tag) => (
                            <Badge key={tag} variant="destructive">-{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => handleToggle(rule.id, rule.is_active)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma regra de automação configurada ainda.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </CompanyLayout>
  );
};

export default TagAutomation;
