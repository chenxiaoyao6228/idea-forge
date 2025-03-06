import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import useUserStore from "@/stores/user";
import { LoginRequestSchema, type LoginRequest } from "shared";
import { providerNames } from "@/components/connections";
import { ProviderConnectionForm } from "@/components/connections";
import Logo from "@/components/logo";
import { ErrorList, Field } from "@/components/forms";
import { Label } from "@/components/ui/label";
import { StatusButton } from "@/components/status-button";
import { authApi } from "@/apis/auth";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userInfo, setUserInfo } = useUserStore();
  const [error, setError] = useState<string | null>(location.state?.error || null);
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  const [isPending, setIsPending] = useState(false);
  const { t, i18n } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    defaultValues: {
      remember: true,
      email: location.state?.email || "",
      password: "",
    },
  });

  // useEffect(() => {
  //   zodI18n.setLanguage(i18n.language as Language);
  // }, [i18n.language]);

  useEffect(() => {
    if (location.state?.error || location.state?.email) {
      navigate(location.pathname + location.search);
    }
  }, [location, navigate]);

  const onSubmit = async (data: LoginRequest) => {
    setIsPending(true);
    try {
      const res = await authApi.login(data);
      if (!res.user) {
        throw new Error("Login failed");
      }
      setUserInfo(res.user);
      navigate(redirectTo || "/");
    } catch (err: any) {
      const errorCode = err.statusCode;
      const errorMessage = err.message || "Login failed";
      setError(errorMessage);
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
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground ">
                <Logo />
              </div>
              Idea Forge
            </span>
            <CardTitle className="text-xl">{t("Login")}</CardTitle>
            <CardDescription>{t("Enter your email below to login to your account")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Field
                labelProps={{
                  children: "Email",
                  className: "font-medium",
                }}
                inputProps={{
                  ...register("email"),
                  type: "email",
                  autoFocus: true,
                  className: "lowercase",
                  autoComplete: "email",
                }}
                errors={errors.email?.message ? [errors.email.message] : []}
              />

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="font-medium">
                    {t("Password")}
                  </Label>
                  <Link to="/forgot-password" className="text-sm underline-offset-4 hover:underline">
                    {t("Forgot password?")}
                  </Link>
                </div>
                <Field
                  labelProps={{
                    children: "Password",
                    className: "sr-only", // 隐藏标签因为我们已经在上面显示了
                  }}
                  inputProps={{
                    ...register("password"),
                    type: "password",
                    autoComplete: "current-password",
                  }}
                  errors={errors.password?.message ? [errors.password.message] : []}
                />
              </div>

              <ErrorList errors={[error].filter(Boolean)} id="form-errors" />

              <StatusButton type="submit" className="w-full" disabled={isPending || isSubmitting} status={isPending ? "pending" : "idle"}>
                Log in
              </StatusButton>

              {providerNames.map((providerName) => (
                <ProviderConnectionForm key={providerName} type="Login" providerName={providerName} redirectTo={redirectTo} />
              ))}

              <div className="text-center text-sm">
                New here?{" "}
                <Link to={redirectTo ? `/register?${encodeURIComponent(redirectTo)}` : "/register"} className="underline underline-offset-4">
                  Create an account
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
