import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ErrorList, OTPField } from "@/components/forms";
import { StatusButton } from "@/components/ui/status-button";
import { useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Logo from "@/components/logo";
import { authApi } from "@/apis/auth";
import { useTranslation } from "react-i18next";
import { CodeValidateRequest, VerificationCodeTypeSchema } from "@idea/contracts";
import { z } from "zod";

// Define query parameter names
export const emailQueryParam = "email";
export const typeQueryParam = "type";
export const codeQueryParam = "code";
export const redirectToQueryParam = "redirectTo";

const CodeValidateSchemaFactory = (t) =>
  z.object({
    email: z.string().email(),
    code: z.string(),
    type: VerificationCodeTypeSchema,
  });

function VerifyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const type = searchParams.get(typeQueryParam) as CodeValidateRequest["type"];
  const email = searchParams.get(emailQueryParam) as CodeValidateRequest["email"];
  const redirectTo = searchParams.get(redirectToQueryParam) || "";
  const { t } = useTranslation();

  if (!type || !email) {
    return <div>Invalid verification type or email or code</div>;
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<CodeValidateRequest>({
    resolver: zodResolver(CodeValidateSchemaFactory(t) as any),
    defaultValues: {
      code: "",
      email,
      type,
    },
  });

  const handleOTPChange = useCallback(
    (value: string) => {
      setValue(codeQueryParam, value);
    },
    [setValue],
  );

  // Define headings based on verification type
  const checkEmail = (
    <>
      <CardTitle className="text-xl">{t("Check your email")}</CardTitle>
      <CardDescription>{t("We've sent you a code to verify your email address")}</CardDescription>
    </>
  );

  const headings: Record<CodeValidateRequest["type"], React.ReactNode> = {
    register: checkEmail,
    "reset-password": checkEmail,
    "change-email": checkEmail,
    "2fa": (
      <>
        <CardTitle className="text-xl">{t("Check your 2FA app")}</CardTitle>
        <CardDescription>{t("Please enter your 2FA code to verify your identity")}</CardDescription>
      </>
    ),
  };

  const onSubmit = async (data: CodeValidateRequest) => {
    setIsPending(true);
    try {
      await authApi.validateCode(data);

      switch (data.type) {
        case "register":
          navigate(redirectTo || "/login");
          break;
        case "reset-password":
          navigate(redirectTo || `/reset-password?email=${encodeURIComponent(email)}`);
          break;
        case "change-email":
          // Handle change email case
          break;
        default:
          break;
      }
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setIsPending(false);
    }
  };

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
            {type ? headings[type] : t("Invalid Verification Type")}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="flex items-center justify-center">
                <OTPField
                  labelProps={{
                    htmlFor: "code",
                    children: "",
                    className: "font-medium",
                  }}
                  inputProps={{
                    onChange: handleOTPChange,
                    autoComplete: "one-time-code",
                    autoFocus: true,
                  }}
                  errors={errors.code?.message ? [errors.code.message] : []}
                />
              </div>
              <input type="hidden" {...register(typeQueryParam)} />
              <input type="hidden" {...register(emailQueryParam)} />

              <ErrorList errors={[error].filter(Boolean)} id="form-errors" />

              <StatusButton className="w-full" status={isPending ? "pending" : "idle"} type="submit" disabled={isPending || isSubmitting}>
                {t("Submit")}
              </StatusButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default VerifyPage;
