import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import useUserStore from "@/stores/user-store";
import useWorkspaceStore, { useFetchWorkspaces } from "@/stores/workspace-store";
import { LoginRequestSchema, type LoginRequest } from "@idea/contracts";
import { providerNames } from "@/components/connections";
import { ProviderConnectionForm } from "@/components/connections";
import Logo from "@/components/logo";
import { ErrorList, Field, PasswordField } from "@/components/forms";
import { Label } from "@/components/ui/label";
import { StatusButton } from "@/components/status-button";
import { authApi } from "@/apis/auth";
import { useTranslation } from "react-i18next";
import { ErrorCodeEnum } from "@api/_shared/constants/api-response-constant";
import { z } from "zod";

// Custom validation schema that matches test expectations
const LoginFormSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof LoginFormSchema>;

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const userInfo = useUserStore((state) => state.userInfo);
  const { run: fetchWorkspaces } = useFetchWorkspaces();
  const [error, setError] = useState<string | null>(location.state?.error || null);
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  const [isPending, setIsPending] = useState(false);
  const { t, i18n } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: {
      remember: true,
      email: location.state?.email || "",
      password: "",
    },
  });
  useEffect(() => {
    if (location.state?.error || location.state?.email) {
      navigate(location.pathname + location.search);
    }
  }, [location, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    setIsPending(true);
    setError(null); // Clear any previous errors when resubmitting

    try {
      // Convert form data to API request format
      const loginRequest: LoginRequest = {
        email: data.email,
        password: data.password,
        remember: data.remember,
      };

      const res = await authApi.login(loginRequest);
      if (!res.user) {
        setError(t("User not found"));
        return;
      }
      useUserStore.setState({ userInfo: res.user });

      // Check if user has workspaces after successful login
      try {
        const workspaces = await fetchWorkspaces();
        if (workspaces.length === 0) {
          // User has no workspaces, redirect to create-workspace
          navigate("/create-workspace");
        } else {
          // User has workspaces, proceed with normal flow
          navigate(redirectTo || "/");
        }
      } catch (workspaceError) {
        console.error("Failed to fetch workspaces:", workspaceError);
        // If workspace fetch fails, still proceed to main app
        navigate(redirectTo || "/");
      }
    } catch (err: any) {
      const errorCode = err.code;
      switch (errorCode) {
        case ErrorCodeEnum.PasswordIncorrect:
          setError(t("The provided password is incorrect"));
          break;
        case ErrorCodeEnum.AuthenticationFailed:
          setError(t("The specified user could not be found"));
          break;
        case ErrorCodeEnum.UserNotActive:
          setError(t("The user is not active"));
          break;
        case ErrorCodeEnum.UserNotFound:
          setError(t("The specified user could not be found"));
          break;
        case ErrorCodeEnum.AccountError:
          setError(t("Account error"));
          break;
        default:
          setError(err.message || t("Authentication failed. Please check your credentials"));
          break;
      }
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
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
              <Field
                labelProps={{
                  children: t("Email"),
                  className: "font-medium",
                }}
                inputProps={{
                  ...register("email"),
                  type: "text", // Changed from "email" to prevent browser native validation
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
                <PasswordField
                  labelProps={{
                    children: t("Password"),
                    className: "sr-only",
                  }}
                  inputProps={{
                    ...register("password"),
                    autoComplete: "current-password",
                  }}
                  errors={errors.password?.message ? [errors.password.message] : []}
                />
              </div>

              <ErrorList errors={[error].filter(Boolean)} id="form-errors" />

              <StatusButton type="submit" className="w-full" disabled={isPending || isSubmitting} status={isPending ? "pending" : "idle"}>
                {t("Log in")}
              </StatusButton>

              {providerNames.map((providerName) => (
                <ProviderConnectionForm key={providerName} type="Login" providerName={providerName} redirectTo={redirectTo} />
              ))}

              <div className="text-center text-sm">
                {t("New here?")}{" "}
                <Link to={redirectTo ? `/register?${encodeURIComponent(redirectTo)}` : "/register"} className="underline underline-offset-4">
                  {t("Create an account")}
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default LoginPage;
