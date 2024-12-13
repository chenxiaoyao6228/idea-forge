import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { ErrorList, Field } from "@/components/forms";
import { StatusButton } from "@/components/ui/status-button";
import { useState } from "react";
import request from "@/lib/request";
import { ForgotPasswordSchema } from "shared";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: { email: string }) => {
    setIsPending(true);
    try {
      await request.post("/api/auth/forgot-password", data);
      navigate(`/verify?email=${encodeURIComponent(data.email)}&type=reset-password`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset request failed");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="container pb-32 pt-20">
      <div className="flex flex-col justify-center">
        <div className="text-center">
          <h1 className="text-h1">Forgot Password</h1>
          <p className="mt-3 text-body-md text-muted-foreground">No worries, we'll send you reset instructions.</p>
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
              }}
              errors={errors.email?.message ? [errors.email.message] : []}
            />
            <ErrorList errors={[error].filter(Boolean)} id="form-errors" />

            <StatusButton className="w-full" status={isPending ? "pending" : "idle"} type="submit" disabled={isPending || isSubmitting}>
              Recover password
            </StatusButton>
          </form>
          <Link to="/login" className="mt-11 text-center text-body-sm font-bold">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
