import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { ErrorList, Field } from "@/components/forms";
import { StatusButton } from "@/components/ui/status-button";
import { useState } from "react";
import request from "@/lib/request";
import { RegisterRequestSchema, RegisterRequest } from "shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Logo from "@/components/logo";
import { authApi } from "@/apis/auth";
import { useTranslation } from "react-i18next";
import HomeNav from "./home/nav";
import WithHomeNav from "@/hocs/with-home-nav";

function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  const [isPending, setIsPending] = useState(false);
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterRequest>({
    resolver: zodResolver(RegisterRequestSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: RegisterRequest) => {
    setIsPending(true);
    try {
      await authApi.register(data);

      navigate(`/verify?email=${encodeURIComponent(data.email)}&type=register`);
    } catch (err: any) {
      setError(err.message || "Registration failed");
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
              Idea Forge
            </span>
            <CardTitle className="text-xl">{t("Register")}</CardTitle>
            <CardDescription>{t("Create your account to get started")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Field
                labelProps={{
                  htmlFor: "email",
                  children: t("Email"),
                }}
                inputProps={{
                  ...register("email"),
                  type: "email",
                  autoFocus: true,
                  autoComplete: "email",
                }}
                errors={errors.email?.message ? [errors.email.message] : []}
              />
              <Field
                labelProps={{
                  htmlFor: "password",
                  children: t("Password"),
                }}
                inputProps={{
                  ...register("password"),
                  type: "password",
                  autoComplete: "new-password",
                }}
                errors={errors.password?.message ? [errors.password.message] : []}
              />
              <ErrorList errors={[error].filter(Boolean)} id="form-errors" />
              <StatusButton className="w-full" status={isPending ? "pending" : "idle"} type="submit" disabled={isPending || isSubmitting}>
                {t("Register")}
              </StatusButton>

              <div className="text-center text-sm">
                {t("Already have an account?")}{" "}
                <Link to={redirectTo ? `/login?${encodeURIComponent(redirectTo)}` : "/login"} className="underline underline-offset-4">
                  {t("Sign in")}
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default WithHomeNav(Register);
