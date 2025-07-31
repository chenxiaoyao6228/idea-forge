import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Logo from "@/components/logo";
import { ResetPwdForm } from "@/components/reset-pwd-form";
import { useTranslation } from "react-i18next";

function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");

  const handleSuccess = () => {
    navigate("/login");
  };

  if (!email) {
    navigate("/login");
    return null;
  }

  return (
    <div className="flex min-h-full flex-col justify-center py-8">
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader>
            <span className="flex items-center gap-2 mb-4 self-center text-2xl font-bold">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Logo />
              </div>
              {t("Idea Forge")}
            </span>
            <CardTitle className="text-xl">{t("Password Reset")}</CardTitle>
            <CardDescription>
              {t("Hi, {{email}}", { email })}. {t("No worries. It happens all the time.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResetPwdForm email={email} mode="set" onSuccess={handleSuccess} submitButtonText={t("Reset password")} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
