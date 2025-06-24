import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { workspaceApi } from "@/apis/workspace";
import { useTranslation } from "react-i18next";
import useWorkspaceStore from "@/stores/workspace";

export default function CreateWorkspace() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const switchWorkspace = useWorkspaceStore((state) => state.switchWorkspace);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await workspaceApi.createWorkspace({ name, description, avatar: "" });

      await switchWorkspace(res.id);

      // reload page
      navigate("/"); // TODO: redirect to workspace dat
    } catch (error) {
      console.error(t("createWorkspaceFailed"), error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-screen py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("create new workspace")}</CardTitle>
          <CardDescription>{t("create workspace description")}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("workspace name")}</Label>
              <Input id="name" placeholder={t("enter workspace name")} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t("workspace description")}</Label>
              <Input id="description" placeholder={t("enter workspace description")} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => navigate("/doc")}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("creating") : t("create workspace")}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
