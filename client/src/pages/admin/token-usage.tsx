import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { aiApi } from "@/apis/ai";
import { TokenUsageData } from "shared";

export default function TokenUsage() {
  const [email, setEmail] = useState("");
  const [tokenLimit, setTokenLimit] = useState("");
  const [tokenUsed, setTokenUsed] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<TokenUsageData | null>(null);
  const { toast } = useToast();

  async function handleLookup() {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter an email address",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await aiApi.getUserTokenUsage(email);

      setUserData(response);
      setTokenLimit(response.monthlyLimit.toString());
      setTokenUsed(response.monthlyUsed.toString());
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
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
        title: "Error",
        description: "Please fill in all fields",
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
        title: "Success",
        description: "Token settings updated successfully",
      });

      // Refresh user data
      await handleLookup();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
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
          <CardTitle>Token Usage Management</CardTitle>
          <CardDescription>Manage user token limits and view usage statistics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <Input placeholder="User Email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
              <Button onClick={handleLookup} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Lookup
              </Button>
            </div>

            {userData && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Current Usage</p>
                    <p className="text-2xl font-bold">{userData.monthlyUsed}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Monthly Limit</p>
                    <p className="text-2xl font-bold">{userData.monthlyLimit}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex gap-4">
                    <Input
                      type="number"
                      placeholder="New Token Limit"
                      value={tokenLimit}
                      onChange={(e) => setTokenLimit(e.target.value)}
                      disabled={isLoading}
                    />
                    <Input type="number" placeholder="Current Usage" value={tokenUsed} onChange={(e) => setTokenUsed(e.target.value)} disabled={isLoading} />
                  </div>
                  <Button onClick={handleUpdateLimit} disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Update Token Settings
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">Last Reset: {new Date(userData.lastResetDate).toLocaleDateString()}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
