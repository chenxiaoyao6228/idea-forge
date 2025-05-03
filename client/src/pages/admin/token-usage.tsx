import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { aiApi } from "@/apis/ai";
import { TokenUsageResponse } from "contracts";
import { useTranslation } from "react-i18next";

export default function TokenUsage() {
  const [email, setEmail] = useState("");
  const [tokenLimit, setTokenLimit] = useState("");
  const [tokenUsed, setTokenUsed] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<TokenUsageResponse | null>(null);
  const { t } = useTranslation();
  const { toast } = useToast();

  async function handleLookup() {
    if (!email) {
      toast({
        variant: "destructive",
        title: t("Error"),
        description: t("Please enter an email address"),
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await aiApi.getUserTokenUsage({ email });

      setUserData(response);
      setTokenLimit(response.monthlyLimit.toString());
      setTokenUsed(response.monthlyUsed.toString());
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("Error"),
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdateLimit() {
    if (!email || !tokenLimit || !tokenUsed) {
      toast({
        variant: "destructive",
        title: t("Error"),
        description: t("Please fill in all fields"),
      });
      return;
    }

    setIsLoading(true);
    try {
      await aiApi.updateUserTokenLimit({
        email,
        monthlyLimit: Number.parseInt(tokenLimit),
        monthlyUsed: Number.parseInt(tokenUsed),
      });

      toast({
        title: t("Success"),
        description: t("Token settings updated successfully"),
      });

      // Refresh user data
      await handleLookup();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("Error"),
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("Token Usage Management")}</CardTitle>
          <CardDescription>{t("Manage user token limits and view usage statistics")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <Input placeholder={t("User Email")} value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
              <Button onClick={handleLookup} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t("Lookup")}
              </Button>
            </div>

            {userData && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{t("Current Usage")}</p>
                    <p className="text-2xl font-bold">{userData.monthlyUsed}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t("Monthly Limit")}</p>
                    <p className="text-2xl font-bold">{userData.monthlyLimit}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex gap-4">
                    <Input
                      type="number"
                      placeholder={t("New Token Limit")}
                      value={tokenLimit}
                      onChange={(e) => setTokenLimit(e.target.value)}
                      disabled={isLoading}
                    />
                    <Input
                      type="number"
                      placeholder={t("Current Usage")}
                      value={tokenUsed}
                      onChange={(e) => setTokenUsed(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <Button onClick={handleUpdateLimit} disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t("Update Token Settings")}
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  {t("Last Reset")}: {new Date(userData.lastResetDate).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
