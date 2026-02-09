import SuperUserLayout from "@/components/layout/SuperUserLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MasterPromptTab } from "@/components/ai/MasterPromptTab";
import { FunctionCallingTab } from "@/components/ai/FunctionCallingTab";
import { PromptInjectionsTab } from "@/components/ai/PromptInjectionsTab";
import { AIPromptLogViewer } from "@/components/ai/AIPromptLogViewer";
import { Brain, Zap, FileText, ScrollText } from "lucide-react";

const AISettings = () => {
  return (
    <SuperUserLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cérebro da IA</h1>
          <p className="text-muted-foreground mt-2">
            Configure o prompt master, funções e prompt injections
          </p>
        </div>

        <Tabs defaultValue="master-prompt" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="master-prompt" className="gap-2">
              <Brain className="h-4 w-4" />
              Prompt Master
            </TabsTrigger>
            <TabsTrigger value="function-calling" className="gap-2">
              <Zap className="h-4 w-4" />
              Function Calling
            </TabsTrigger>
            <TabsTrigger value="prompt-injections" className="gap-2">
              <FileText className="h-4 w-4" />
              Prompt Injections
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <ScrollText className="h-4 w-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="master-prompt" className="mt-6">
            <MasterPromptTab />
          </TabsContent>

          <TabsContent value="function-calling" className="mt-6">
            <FunctionCallingTab />
          </TabsContent>

          <TabsContent value="prompt-injections" className="mt-6">
            <PromptInjectionsTab />
          </TabsContent>

          <TabsContent value="logs" className="mt-6">
            <AIPromptLogViewer />
          </TabsContent>
        </Tabs>
      </div>
    </SuperUserLayout>
  );
};

export default AISettings;
