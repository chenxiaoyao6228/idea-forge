import { z } from "zod";
import { Icon } from "@/components/ui/icon";
import { StatusButton } from "@/components/ui/status-button";
import { useState } from "react";

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
  [GITHUB_PROVIDER_NAME]: <Icon name="GithubLogo" />,
  // [GOOGLE_PROVIDER_NAME]: <Icon name="Google" />,
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

  const handleSubmit = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsPending(true);

    // 构建重定向URL
    const baseUrl = `api/auth/${providerName}/login`;
    const params = new URLSearchParams({
      provider: providerName,
      ...(redirectTo ? { redirectTo } : {}),
    });

    // 重定向到认证页面
    window.location.href = `${baseUrl}?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-center gap-2" onClick={handleSubmit}>
      <StatusButton variant="outline" type="submit" className="w-full" status={isPending ? "pending" : "idle"}>
        <div className="inline-flex items-center gap-1.5">
          {providerIcons[providerName]}
          <span>{isPending ? `${type}ing with ${label}` : `${type} with ${label}`}</span>
        </div>
      </StatusButton>
    </div>
  );
}
