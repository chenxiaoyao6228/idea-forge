import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ErrorList, OTPField } from "@/components/forms";
import { Spacer } from "@/components/spacer";
import { StatusButton } from "@/components/ui/status-button";
import { useState } from "react";
import request from "@/lib/request";
import { CodeValidateSchema, CodeValidateData } from "shared";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Logo from "@/components/logo";

// Define query parameter names
export const emailQueryParam = "email";
export const typeQueryParam = "type";
export const codeQueryParam = "code";
export const redirectToQueryParam = "redirectTo";

export default function VerifyRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const type = searchParams.get(typeQueryParam) as CodeValidateData["type"];
  const email = searchParams.get(emailQueryParam) as CodeValidateData["email"];
  const redirectTo = searchParams.get(redirectToQueryParam) || "";

  if (!type || !email) {
    return <div>Invalid verification type or email or code</div>;
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CodeValidateData>({
    resolver: zodResolver(CodeValidateSchema),
    defaultValues: {
      code: "",
      email,
      type,
    },
  });

  // Define headings based on verification type
  const checkEmail = (
    <>
      <CardTitle className="text-xl">Check your email</CardTitle>
      <CardDescription>We've sent you a code to verify your email address.</CardDescription>
    </>
  );

  const headings: Record<CodeValidateData["type"], React.ReactNode> = {
    register: checkEmail,
    "reset-password": checkEmail,
    "change-email": checkEmail,
    "2fa": (
      <>
        <CardTitle className="text-xl">Check your 2FA app</CardTitle>
        <CardDescription>Please enter your 2FA code to verify your identity.</CardDescription>
      </>
    ),
  };

  const onSubmit = async (data: CodeValidateData) => {
    setIsPending(true);
    try {
      await request.post("/api/auth/code/validate", data);

      switch (data.type) {
        case "register":
          navigate(redirectTo || "/login");
          break;
        case "reset-password":
          navigate(redirectTo || `/reset-password?email=${encodeURIComponent(email)}`);
          break;
        case "change-email":
          // Handle change email case
          break;
        default:
          break;
      }
    } catch (err: any) {
      setError(err.message || "Verification failed");
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
            {type ? headings[type] : "Invalid Verification Type"}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="flex items-center justify-center">
                <OTPField
                  labelProps={{
                    htmlFor: "code",
                    children: "",
                    className: "font-medium",
                  }}
                  inputProps={{
                    ...register(codeQueryParam),
                    autoComplete: "one-time-code",
                    autoFocus: true,
                  }}
                  errors={errors.code?.message ? [errors.code.message] : []}
                />
              </div>
              <input type="hidden" {...register(typeQueryParam)} />
              <input type="hidden" {...register(emailQueryParam)} />

              <ErrorList errors={[error].filter(Boolean)} id="form-errors" />

              <StatusButton className="w-full" status={isPending ? "pending" : "idle"} type="submit" disabled={isPending || isSubmitting}>
                Submit
              </StatusButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
