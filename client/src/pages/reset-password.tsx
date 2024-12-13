import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ErrorList, Field } from "@/components/forms";
import { StatusButton } from "@/components/ui/status-button";
import { useState } from "react";
import request from "@/lib/request";
import { PasswordSchema } from "shared";
import { z } from "zod";

const PasswordAndConfirmPasswordSchema = z
  .object({ password: PasswordSchema, confirmPassword: PasswordSchema })
  .superRefine(({ confirmPassword, password }, ctx) => {
    if (confirmPassword !== password) {
      ctx.addIssue({
        path: ["confirmPassword"],
        code: "custom",
        message: "The passwords must match",
      });
    }
  });

export default function ResetPasswordPage() {
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
    resolver: zodResolver(PasswordAndConfirmPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: { password: string; confirmPassword: string }) => {
    if (!email) {
      setError("Email is required");
      return;
    }

    setIsPending(true);
    try {
      await request.post("/api/auth/reset-password", {
        email,
        password: data.password,
      });
      navigate("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setIsPending(false);
    }
  };

  if (!email) {
    navigate("/login");
    return null;
  }

  return (
    <div className="container flex flex-col justify-center pb-32 pt-20">
      <div className="text-center">
        <h1 className="text-h1">Password Reset</h1>
        <p className="mt-3 text-body-md text-muted-foreground">Hi, {email}. No worries. It happens all the time.</p>
      </div>
      <div className="mx-auto mt-16 min-w-full max-w-sm sm:min-w-[368px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Field
            labelProps={{
              htmlFor: "password",
              children: "New Password",
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
              children: "Confirm Password",
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
            Reset password
          </StatusButton>
        </form>
      </div>
    </div>
  );
}
