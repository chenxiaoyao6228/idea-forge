import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ErrorList, OTPField } from "@/components/forms";
import { Spacer } from "@/components/spacer";
import { StatusButton } from "@/components/ui/status-button";
import { useState } from "react";
import request from "@/lib/request";
import { CodeValidateSchema, CodeValidateData } from "shared";

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
      <h1 className="text-h1">Check your email</h1>
      <p className="mt-3 text-body-md text-muted-foreground">We've sent you a code to verify your email address.</p>
    </>
  );

  const headings: Record<CodeValidateData["type"], React.ReactNode> = {
    register: checkEmail,
    "reset-password": checkEmail,
    "change-email": checkEmail,
    "2fa": (
      <>
        <h1 className="text-h1">Check your 2FA app</h1>
        <p className="mt-3 text-body-md text-muted-foreground">Please enter your 2FA code to verify your identity.</p>
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
          navigate(redirectTo || "/reset-password");
          break;
        case "change-email":
          // Handle change email case
          break;
        default:
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <main className="container flex flex-col justify-center pb-32 pt-20">
      <div className="text-center">{type ? headings[type] : "Invalid Verification Type"}</div>

      <Spacer size="xs" />

      <div className="mx-auto flex w-72 max-w-full flex-col justify-center gap-1">
        <div>
          <ErrorList errors={[error].filter(Boolean)} id="form-errors" />
        </div>
        <div className="flex w-full gap-2">
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1">
            <div className="flex items-center justify-center">
              <OTPField
                labelProps={{
                  htmlFor: "code",
                  children: "Code",
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
            <StatusButton className="w-full" status={isPending ? "pending" : "idle"} type="submit" disabled={isPending || isSubmitting}>
              Submit
            </StatusButton>
          </form>
        </div>
      </div>
    </main>
  );
}
