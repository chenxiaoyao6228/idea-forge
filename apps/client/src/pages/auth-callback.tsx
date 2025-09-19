import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useUserStore, { UserInfo } from "@/stores/user-store";
import type { AuthResponseType, AuthResponseData } from "@idea/contracts";
import { useTranslation } from "react-i18next";

export default function AuthCallbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Use direct setState for simple state updates
  const type = searchParams.get("type") as AuthResponseType;
  const data = JSON.parse(searchParams.get("data") ?? "{}") as AuthResponseData;

  console.log("---AuthCallbackPage-----", data);

  useEffect(() => {
    switch (type) {
      case "NEW_USER":
      case "EXISTING_USER": {
        useUserStore.setState({ userInfo: data.user as UserInfo });
        navigate("/");
        break;
      }

      case "EMAIL_CONFLICT": {
        navigate("/login", {
          state: {
            error: t("An account with this email already exists. Please login first."),
            email: data.user?.email,
          },
        });
        break;
      }

      default: {
        navigate("/login", {
          state: {
            error: searchParams.get("message") ?? t("Authentication failed"),
            email: data.user?.email,
          },
        });
      }
    }
  }, [type, t]);

  return null;
}
