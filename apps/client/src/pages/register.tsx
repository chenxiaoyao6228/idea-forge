import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { ErrorList, Field, PasswordField } from "@/components/forms";
import { StatusButton } from "@/components/status-button";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@idea/ui/shadcn/ui/card";
import { Label } from "@idea/ui/shadcn/ui/label";
import Logo from "@/components/logo";
import { authApi } from "@/apis/auth";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { ErrorCodeEnum } from "@api/_shared/constants/api-response-constant";

const RegisterRequestSchemaFactory = (t) =>
  z.object({
    email: z.string().email(t("Invalid email address")),
    password: z.string().min(8, t("Password must be at least 8 characters")),
  });

function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  const [isPending, setIsPending] = useState(false);
  const { t } = useTranslation();

  const RegisterRequestSchema = RegisterRequestSchemaFactory(t);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof RegisterRequestSchema>>({
    resolver: zodResolver(RegisterRequestSchema),
    mode: "onBlur", // Validate on blur for better UX
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data) => {
    setIsPending(true);
    setError(null); // Clear previous errors
    try {
      await authApi.register(data);

      const _redirectTo = redirectTo || "/login";

      navigate(`/verify?email=${encodeURIComponent(data.email)}&type=register&redirectTo=${encodeURIComponent(_redirectTo)}`, {
        state: { password: data.password },
      });
    } catch (err: any) {
      const code = err.code;
      if (code === ErrorCodeEnum.UserAlreadyExists) {
        setError(t("Email already exists"));
        return;
      }
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
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" data-testid="register-form">
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
                  "data-testid": "email-input",
                }}
                errors={errors.email?.message ? [errors.email.message] : []}
              />
              <PasswordField
                labelProps={{
                  children: t("Password"),
                  className: "font-medium",
                }}
                inputProps={{
                  ...register("password"),
                  id: "password",
                  autoComplete: "new-password",
                  "data-testid": "password-input",
                }}
                errors={errors.password?.message ? [errors.password.message] : []}
              />
              <ErrorList errors={[error].filter(Boolean)} id="form-errors" data-testid="form-errors" />
              <StatusButton
                className="w-full"
                status={isPending ? "pending" : "idle"}
                type="submit"
                disabled={isPending || isSubmitting}
                data-testid="register-button"
              >
                {t("Register")}
              </StatusButton>

              <div className="text-center text-sm">
                {t("Already have an account?")}{" "}
                <Link to={redirectTo ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : "/login"} className="underline underline-offset-4">
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

export default Register;
