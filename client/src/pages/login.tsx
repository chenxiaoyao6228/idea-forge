import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Spacer } from "@/components/spacer";
import { ErrorList, Field } from "@/components/forms";
import { StatusButton } from "@/components/ui/status-button";
import { useState } from "react";
import useUserStore, { UserInfo } from "@/stores/user";
import request from "@/lib/request";

export const EmailSchema = z
  .string({ required_error: "Email is required" })
  .email({ message: "Email is invalid" })
  .min(3, { message: "Email is too short" })
  .max(100, { message: "Email is too long" })
  // users can type the email in any case, but we store it in lowercase
  .transform((value) => value.toLowerCase().trim());

export const PasswordSchema = z
  .string({ required_error: "Password is required" })
  .min(6, { message: "Password is too short" })
  .max(100, { message: "Password is too long" })
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    // TODO: i18n
    message: "Password must contain uppercase, lowercase letters and numbers",
  });

const LoginFormSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  redirectTo: z.string().optional(),
  remember: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof LoginFormSchema>;

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
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: {
      redirectTo: "",
      remember: true,
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsPending(true);
    try {
      const user = (await request.post("/api/auth/login", data)) as UserInfo;

      // 保存用户信息和token
      setUserInfo(user);

      // 登录成功后跳转
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

              {/* <div className="flex justify-between">
                <CheckboxField
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
                />
                <div>
                  <Link to="/forgot-password" className="text-body-xs font-semibold">
                    Forgot password?
                  </Link>
                </div>
              </div> */}

              <input type="hidden" {...register("redirectTo")} />
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
