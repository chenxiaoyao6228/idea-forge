import { z } from "zod";
import { Google } from "@idea/icons";
import { StatusButton } from "@idea/ui/base/status-button";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Github } from "lucide-react";

export const GITHUB_PROVIDER_NAME = "github";
export const GOOGLE_PROVIDER_NAME = "google";

export const providerNames = [
  GITHUB_PROVIDER_NAME,
  // GOOGLE_PROVIDER_NAME // FIXME： 正式环境谷歌应用需要审核，后续再开放
] as const;
export const ProviderNameSchema = z.enum(providerNames);
export type ProviderName = z.infer<typeof ProviderNameSchema>;

export const providerLabels: Record<ProviderName, string> = {
  [GITHUB_PROVIDER_NAME]: "GitHub",
  // [GOOGLE_PROVIDER_NAME]: "Google",
} as const;

export const providerIcons: Record<ProviderName, React.ReactNode> = {
  [GITHUB_PROVIDER_NAME]: <Github />,
  // [GOOGLE_PROVIDER_NAME]: <Google />,
} as const;

export function ProviderConnectionForm({
  redirectTo,
  type,
  providerName,
}: {
  redirectTo?: string | null;
  type: "Connect" | "Login" | "Signup";
  providerName: ProviderName;
}) {
  const label = providerLabels[providerName];
  const [isPending, setIsPending] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsPending(true);

    // construct redirect URL
    const baseUrl = `api/auth/${providerName}/login`;
    const params = new URLSearchParams({
      provider: providerName,
      ...(redirectTo ? { redirectTo } : {}),
    });

    // redirect to auth page
    window.location.href = `${baseUrl}?${params.toString()}`;
  };

  const messages = {
    Connect: {
      pending: t("Connecting with {{provider}}", { provider: label }),
      idle: t("Connect with {{provider}}", { provider: label }),
    },
    Login: {
      pending: t("Logging in with {{provider}}", { provider: label }),
      idle: t("Login with {{provider}}", { provider: label }),
    },
    Signup: {
      pending: t("Signing up with {{provider}}", { provider: label }),
      idle: t("Signup with {{provider}}", { provider: label }),
    },
  };

  return (
    <div className="flex items-center justify-center gap-2" onClick={handleSubmit}>
      <StatusButton variant="outline" type="submit" className="w-full" status={isPending ? "pending" : "idle"}>
        <div className="inline-flex items-center gap-1.5">
          {providerIcons[providerName]}
          <span>{isPending ? messages[type].pending : messages[type].idle}</span>
        </div>
      </StatusButton>
    </div>
  );
}
