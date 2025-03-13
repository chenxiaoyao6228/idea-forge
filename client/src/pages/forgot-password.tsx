import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { ErrorList, Field } from "@/components/forms";
import { StatusButton } from "@/components/ui/status-button";
import { useState } from "react";
import { ForgotPasswordRequestSchema, ForgotPasswordRequest } from "shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Logo from "@/components/logo";
import { authApi } from "@/apis/auth";
import { useTranslation } from "react-i18next";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(ForgotPasswordRequestSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: { email: string }) => {
    setIsPending(true);
    try {
      await authApi.forgotPassword(data);
      navigate(`/verify?email=${encodeURIComponent(data.email)}&type=reset-password`);
    } catch (err: any) {
      setError(err.message || t("Password reset request failed"));
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
            <CardTitle className="text-xl">{t("Forgot Password")}</CardTitle>
            <CardDescription>{t("No worries, we'll send you reset instructions.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Field
                labelProps={{
                  htmlFor: "email",
                  children: t("Email"),
                  className: "font-medium",
                }}
                inputProps={{
                  ...register("email"),
                  type: "email",
                  autoFocus: true,
                  autoComplete: "email",
                }}
                errors={errors.email?.message ? [errors.email.message] : []}
              />
              <ErrorList errors={[error].filter(Boolean)} id="form-errors" />

              <StatusButton className="w-full" status={isPending ? "pending" : "idle"} type="submit" disabled={isPending || isSubmitting}>
                {t("Recover password")}
              </StatusButton>

              <div className="text-center text-sm">
                {t("Remember your password?")}{" "}
                <Link to="/login" className="underline underline-offset-4">
                  {t("Back to Login")}
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
