import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Spacer } from "@/components/spacer";
import { CheckboxField, ErrorList, Field } from "@/components/forms";
import { StatusButton } from "@/components/ui/status-button";
import { useState } from "react";
import useUserStore, { UserInfo } from "@/stores/user";
import request from "@/lib/request";
import { LoginSchema, type LoginData } from "shared";

export default function LoginPage() {
  const navigate = useNavigate();
  const { userInfo, setUserInfo } = useUserStore();
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      remember: true,
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginData) => {
    setIsPending(true);
    try {
      const user = await request.post<LoginData, UserInfo>("/api/auth/login", data);
      setUserInfo(user);
      navigate(redirectTo || "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col justify-center pb-32 pt-20">
      <div className="mx-auto w-full max-w-md">
        <div className="flex flex-col gap-3 text-center">
          <h1 className="text-h1">Welcome back!</h1>
        </div>
        <Spacer size="xs" />
        <div>
          <div className="mx-auto w-full max-w-md px-8">
            <form onSubmit={handleSubmit(onSubmit)}>
              <Field
                labelProps={{ children: "Email" }}
                inputProps={{
                  ...register("email"),
                  type: "email",
                  autoFocus: true,
                  className: "lowercase",
                  autoComplete: "email",
                }}
                errors={errors.email?.message ? [errors.email.message] : []}
              />

              <Field
                labelProps={{ children: "Password" }}
                inputProps={{
                  ...register("password"),
                  type: "password",
                  autoComplete: "current-password",
                }}
                errors={errors.password?.message ? [errors.password.message] : []}
              />

              <div className="flex justify-between">
                {/* <CheckboxField
                  labelProps={{
                    htmlFor: "remember",
                    children: "Remember me",
                  }}
                  buttonProps={{
                    name: "remember",
                    onChange: (checked: boolean) => {
                      register("remember").onChange({ target: { checked } });
                    },
                  }}
                  errors={errors.remember?.message ? [errors.remember.message] : []}
                /> */}
                <div>
                  <Link to="/forgot-password" className="text-body-xs font-semibold">
                    Forgot password?
                  </Link>
                </div>
              </div>

              <ErrorList errors={[error].filter(Boolean)} id="form-errors" />

              <div className="flex items-center justify-between gap-6 pt-3">
                <StatusButton className="w-full" status={isPending ? "pending" : "idle"} type="submit" disabled={isPending || isSubmitting}>
                  Log in
                </StatusButton>
              </div>
            </form>
            <div className="flex items-center justify-center gap-2 pt-6">
              <span className="text-muted-foreground">New here?</span>
              <Link to={redirectTo ? `/register?${encodeURIComponent(redirectTo)}` : "/register"}>Create an account</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
