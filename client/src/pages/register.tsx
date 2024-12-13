import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { ErrorList, Field } from "@/components/forms";
import { StatusButton } from "@/components/ui/status-button";
import { useState } from "react";
import request from "@/lib/request";
import { RegisterSchema, RegisterData } from "shared";

export default function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterData>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: RegisterData) => {
    setIsPending(true);
    try {
      await request.post("/api/auth/register", data);

      // 注册成功后跳转到验证页面
      navigate(`/verify?email=${encodeURIComponent(data.email)}&type=register`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="container flex flex-col justify-center pb-32 pt-20">
      <div className="text-center">
        <h1 className="text-h1">Let's start your journey!</h1>
      </div>
      <div className="mx-auto mt-16 min-w-full max-w-sm sm:min-w-[368px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Field
            labelProps={{
              htmlFor: "email",
              children: "Email",
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
              children: "Password",
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
            Register
          </StatusButton>
        </form>
        <div className="flex items-center justify-center gap-2 pt-6">
          <span className="text-muted-foreground">Already have an account?</span>
          <Link to={redirectTo ? `/login?${encodeURIComponent(redirectTo)}` : "/login"}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
