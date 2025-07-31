import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import { ErrorList, Field } from "@/components/forms";
import { StatusButton } from "@/components/ui/status-button";
import { Button } from "@/components/ui/button";
import { authApi } from "@/apis/auth";
import type { ResetPasswordRequest, SetPasswordRequest } from "@idea/contracts";

// Error code mapping for user-friendly messages
const getErrorMessage = (errorCode: string, t: TFunction): string => {
  const errorMessages: Record<string, string> = {
    current_password_incorrect: t("Current password is incorrect"),
    password_too_weak: t("Password is too weak"),
    same_password_not_allowed: t("New password must be different from current password"),
    user_not_found: t("User not found"),
    user_not_active: t("Account is not active"),
    password_not_set: t("No password is set for this account"),
  };

  return errorMessages[errorCode] || t("Password operation failed");
};

// Schema for setting password (first time)
const createSetPasswordSchema = (t: TFunction) => {
  return z
    .object({
      password: z.string().min(8, t("Password must be at least 8 characters")),
      confirmPassword: z.string().min(1, t("Confirm password is required")),
    })
    .refine((data) => data.confirmPassword === data.password, {
      message: t("The passwords must match"),
      path: ["confirmPassword"],
    });
};

// Schema for resetting password (change existing)
const createResetPasswordSchema = (t: TFunction) => {
  return z
    .object({
      currentPassword: z.string().min(1, t("Current password is required")),
      newPassword: z.string().min(8, t("Password must be at least 8 characters")),
      confirmPassword: z.string().min(1, t("Confirm password is required")),
    })
    .refine((data) => data.confirmPassword === data.newPassword, {
      message: t("The passwords must match"),
      path: ["confirmPassword"],
    });
};

type SetPasswordFormData = z.infer<ReturnType<typeof createSetPasswordSchema>>;
type ResetPasswordFormData = z.infer<ReturnType<typeof createResetPasswordSchema>>;

interface BaseResetPwdFormProps {
  email: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
  className?: string;
}

interface SetPasswordProps extends BaseResetPwdFormProps {
  mode: "set";
  submitButtonText?: string;
}

interface ResetPasswordProps extends BaseResetPwdFormProps {
  mode: "reset";
  submitButtonText?: string;
}

type ResetPwdFormProps = SetPasswordProps | ResetPasswordProps;

export const ResetPwdForm: React.FC<ResetPwdFormProps> = ({ email, mode, onSuccess, onCancel, showCancelButton = false, submitButtonText, className = "" }) => {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const isResetMode = mode === "reset";

  // Use appropriate schema based on mode
  const schema = isResetMode ? createResetPasswordSchema(t) : createSetPasswordSchema(t);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SetPasswordFormData | ResetPasswordFormData>({
    resolver: zodResolver(schema),
    defaultValues: isResetMode
      ? {
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }
      : {
          password: "",
          confirmPassword: "",
        },
  });

  const onSubmit = async (data: SetPasswordFormData | ResetPasswordFormData) => {
    setIsPending(true);
    setError(null);

    try {
      if (isResetMode) {
        // Reset password mode - requires current password
        const resetData = data as ResetPasswordFormData;
        const payload: ResetPasswordRequest = {
          email,
          currentPassword: resetData.currentPassword,
          newPassword: resetData.newPassword,
        };
        await authApi.resetPassword(payload);
      } else {
        // Set password mode - first time setting password
        const setData = data as SetPasswordFormData;
        const payload: SetPasswordRequest = {
          email,
          password: setData.password,
        };
        await authApi.setPassword(payload);
      }

      reset();
      onSuccess?.();
    } catch (err: any) {
      const errorCode = err?.code || err?.message;
      setError(getErrorMessage(errorCode, t));
    } finally {
      setIsPending(false);
    }
  };

  const handleCancel = () => {
    reset();
    setError(null);
    onCancel?.();
  };

  const getDefaultSubmitText = () => {
    return isResetMode ? t("Change Password") : t("Set Password");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`flex flex-col gap-4 ${className}`}>
      {isResetMode && (
        <Field
          labelProps={{
            htmlFor: "currentPassword",
            children: t("Current Password"),
            className: "font-medium",
          }}
          inputProps={{
            ...register("currentPassword"),
            type: "password",
            autoComplete: "current-password",
            autoFocus: true,
          }}
          errors={isResetMode && (errors as any).currentPassword?.message ? [(errors as any).currentPassword.message] : []}
        />
      )}

      <Field
        labelProps={{
          htmlFor: isResetMode ? "newPassword" : "password",
          children: isResetMode ? t("New Password") : t("Password"),
          className: "font-medium",
        }}
        inputProps={{
          ...register(isResetMode ? "newPassword" : "password"),
          type: "password",
          autoComplete: "new-password",
          autoFocus: !isResetMode,
        }}
        errors={
          isResetMode
            ? (errors as any).newPassword?.message
              ? [(errors as any).newPassword.message]
              : []
            : (errors as any).password?.message
              ? [(errors as any).password.message]
              : []
        }
      />

      <Field
        labelProps={{
          htmlFor: "confirmPassword",
          children: isResetMode ? t("Confirm New Password") : t("Confirm Password"),
          className: "font-medium",
        }}
        inputProps={{
          ...register("confirmPassword"),
          type: "password",
          autoComplete: "new-password",
        }}
        errors={errors.confirmPassword?.message ? [errors.confirmPassword.message] : []}
      />

      <ErrorList errors={[error].filter(Boolean)} id="form-errors" />

      <div className="flex gap-2 flex-col sm:flex-row sm:justify-end">
        {showCancelButton && (
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending} className="w-full sm:w-auto">
            {t("Cancel")}
          </Button>
        )}
        <StatusButton status={isPending ? "pending" : "idle"} type="submit" disabled={isPending || isSubmitting} className="w-full sm:w-auto">
          {submitButtonText || getDefaultSubmitText()}
        </StatusButton>
      </div>
    </form>
  );
};
