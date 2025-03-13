import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ErrorList, Field } from "@/components/forms";
import { StatusButton } from "@/components/ui/status-button";
import { useState } from "react";
import { PasswordSchema } from "shared";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Logo from "@/components/logo";
import { authApi } from "@/apis/auth";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import HomeNav from "./home/nav";
import WithHomeNav from "@/hocs/with-home-nav";

const createPasswordAndConfirmPasswordSchema = (t: TFunction) =>
  z.object({ password: PasswordSchema, confirmPassword: PasswordSchema }).superRefine(({ confirmPassword, password }, ctx) => {
    if (confirmPassword !== password) {
      ctx.addIssue({
        path: ["confirmPassword"],
        code: "custom",
        message: t("The passwords must match"),
      });
    }
  });

function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createPasswordAndConfirmPasswordSchema(t)),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: { password: string; confirmPassword: string }) => {
    if (!email) {
      setError(t("Email is required"));
      return;
    }

    setIsPending(true);
    try {
      await authApi.resetPassword({
        email,
        password: data.password,
      });
      navigate("/login");
    } catch (err: any) {
      setError(err.message || t("Password reset failed"));
    } finally {
      setIsPending(false);
    }
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
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Field
                labelProps={{
                  htmlFor: "password",
                  children: t("New Password"),
                  className: "font-medium",
                }}
                inputProps={{
                  ...register("password"),
                  type: "password",
                  autoComplete: "new-password",
                  autoFocus: true,
                }}
                errors={errors.password?.message ? [errors.password.message] : []}
              />
              <Field
                labelProps={{
                  htmlFor: "confirmPassword",
                  children: t("Confirm Password"),
                  className: "font-medium",
                }}
                inputProps={{
                  ...register("confirmPassword"),
                  type: "password",
                  autoComplete: "new-password",
                }}
                errors={errors.confirmPassword?.message ? [errors.confirmPassword.message] : []}
              />

              <ErrorList errors={[error].filter(Boolean)} id="form-errors" />

              <StatusButton className="w-full" status={isPending ? "pending" : "idle"} type="submit" disabled={isPending || isSubmitting}>
                {t("Reset password")}
              </StatusButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default WithHomeNav(ResetPasswordPage);
