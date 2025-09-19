import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { workspaceApi } from "@/apis/workspace";
import { useTranslation } from "react-i18next";
import useWorkspaceStore, { useSwitchWorkspace, useSetCurrentWorkspace } from "@/stores/workspace-store";
import { WorkspaceTypeEnum } from "@idea/contracts";
import { Check, User, Users, Loader2 } from "lucide-react";

type Step = "type-selection" | "name-input" | "initializing";

export default function CreateWorkspace() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>("type-selection");
  const [workspaceType, setWorkspaceType] = useState<WorkspaceTypeEnum | null>(null);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { run: switchWorkspace } = useSwitchWorkspace();
  const setCurrentWorkspace = useSetCurrentWorkspace();

  const handleTypeSelection = (type: WorkspaceTypeEnum) => {
    setWorkspaceType(type);
    setCurrentStep("name-input");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !workspaceType) return;

    setIsSubmitting(true);
    setCurrentStep("initializing");

    try {
      const res = await workspaceApi.initializeWorkspace({
        name,
        description: "",
        avatar: "",
        type: workspaceType,
      });

      localStorage.setItem("workspaceId", res.workspace.id);

      // Navigate to workspace
      navigate("/");
    } catch (error) {
      console.error(t("createWorkspaceFailed"), error);
      setCurrentStep("name-input");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentStep === "name-input") {
      setCurrentStep("type-selection");
    } else if (currentStep === "initializing") {
      setCurrentStep("name-input");
    }
  };

  const handleCancel = () => {
    navigate("/");
  };

  // Type selection step
  if (currentStep === "type-selection") {
    return (
      <div className="container flex items-center justify-center min-h-screen py-10">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{t("How do you want to use Idea Forge?")}</h1>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Personal Use Option */}
            <Card
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                workspaceType === WorkspaceTypeEnum.PERSONAL ? "ring-2 ring-gray-900 border-gray-900" : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => handleTypeSelection(WorkspaceTypeEnum.PERSONAL)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <User className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{t("Personal Use")}</h3>
                    </div>
                  </div>
                  {workspaceType === WorkspaceTypeEnum.PERSONAL && (
                    <div className="p-1 bg-gray-900 rounded-full">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-gray-600 text-sm">{t("Build personal information repositories, notes, knowledge, to-dos, plans, etc.")}</p>
              </CardContent>
            </Card>

            {/* Team Use Option */}
            <Card
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                workspaceType === WorkspaceTypeEnum.TEAM ? "ring-2 ring-gray-900 border-gray-900" : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => handleTypeSelection(WorkspaceTypeEnum.TEAM)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Users className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{t("Team Use")}</h3>
                    </div>
                  </div>
                  {workspaceType === WorkspaceTypeEnum.TEAM && (
                    <div className="p-1 bg-gray-900 rounded-full">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-gray-600 text-sm">{t("Build your team's information repository, collaborate with members, etc.")}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center space-x-4 mt-8">
            <Button variant="outline" onClick={handleCancel}>
              {t("Cancel Operation")}
            </Button>
            {workspaceType && <Button onClick={() => setCurrentStep("name-input")}>{t("Next Step")}</Button>}
          </div>
        </div>
      </div>
    );
  }

  // Name input step
  if (currentStep === "name-input") {
    return (
      <div className="container flex items-center justify-center min-h-screen py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              {workspaceType === WorkspaceTypeEnum.PERSONAL ? t("Please enter personal workspace name") : t("Please enter team workspace name")}
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder={workspaceType === WorkspaceTypeEnum.PERSONAL ? "york's personal workspace" : "york's team workspace"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="text-center"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button type="submit" disabled={!name.trim() || isSubmitting} className="w-full">
                {t("Create Space")}
              </Button>
              <Button type="button" variant="outline" onClick={handleBack} className="w-full">
                {t("Cancel Operation")}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  // Initializing step
  if (currentStep === "initializing") {
    return (
      <div className="container flex items-center justify-center min-h-screen py-10">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <Loader2 className="h-12 w-12 animate-spin text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{t("Initializing workspace...")}</h2>
              <p className="text-gray-600">{t("Space initialization settings are in progress, please wait")}</p>
            </div>
            <Button variant="outline" onClick={handleCancel} className="w-full">
              {t("Cancel Operation")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
