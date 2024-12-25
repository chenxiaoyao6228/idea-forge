import type React from "react";
import { useId } from "react";
import { type OTPInputProps } from "input-otp";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import { Checkbox, type CheckboxProps } from "./ui/checkbox.tsx";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "./ui/input-otp.tsx";
import { Input } from "./ui/input.tsx";
import { Label } from "./ui/label.tsx";
import { Textarea } from "./ui/textarea.tsx";

export type ListOfErrors = Array<string | null | undefined> | null | undefined;

// ErrorList component remains the same
export function ErrorList({
  id,
  errors,
}: {
  errors?: ListOfErrors;
  id?: string;
}) {
  const errorsToRender = errors?.filter(Boolean);
  if (!errorsToRender?.length) return null;
  return (
    <ul id={id} className="flex flex-col gap-1">
      {errorsToRender.map((e) => (
        <li key={e} className="text-[10px] text-foreground-destructive">
          {e}
        </li>
      ))}
    </ul>
  );
}

export function Field({
  labelProps,
  inputProps,
  errors,
  className,
}: {
  labelProps: React.LabelHTMLAttributes<HTMLLabelElement>;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
  errors?: ListOfErrors;
  className?: string;
}) {
  const fallbackId = useId();
  const id = inputProps.id ?? fallbackId;
  const errorId = errors?.length ? `${id}-error` : undefined;
  return (
    <div className={className}>
      <Label htmlFor={id} {...labelProps} />
      <Input id={id} aria-invalid={errorId ? true : undefined} aria-describedby={errorId} {...inputProps} />
      {errorId ? <ErrorList id={errorId} errors={errors} /> : null}
    </div>
  );
}

// OTPField remains largely the same
export function OTPField({
  labelProps,
  inputProps,
  errors,
  className,
}: {
  labelProps: React.LabelHTMLAttributes<HTMLLabelElement>;
  inputProps: Partial<OTPInputProps & { render: never }>;
  errors?: ListOfErrors;
  className?: string;
}) {
  const fallbackId = useId();
  const id = inputProps.id ?? fallbackId;
  const errorId = errors?.length ? `${id}-error` : undefined;
  return (
    <div className={className}>
      <Label htmlFor={id} {...labelProps} />
      <InputOTP
        pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
        maxLength={6}
        id={id}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={errorId}
        {...inputProps}
      >
        <InputOTPGroup>
          <InputOTPSlot index={0} />
        </InputOTPGroup>

        <InputOTPGroup>
          <InputOTPSlot index={1} />
        </InputOTPGroup>

        <InputOTPGroup>
          <InputOTPSlot index={2} />
        </InputOTPGroup>

        <InputOTPGroup>
          <InputOTPSlot index={3} />
        </InputOTPGroup>

        <InputOTPGroup>
          <InputOTPSlot index={4} />
        </InputOTPGroup>

        <InputOTPGroup>
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
      <div className="min-h-[32px] px-4 pb-3 pt-1">{errorId ? <ErrorList id={errorId} errors={errors} /> : null}</div>
    </div>
  );
}

export function TextareaField({
  labelProps,
  textareaProps,
  errors,
  className,
}: {
  labelProps: React.LabelHTMLAttributes<HTMLLabelElement>;
  textareaProps: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
  errors?: ListOfErrors;
  className?: string;
}) {
  const fallbackId = useId();
  const id = textareaProps.id ?? textareaProps.name ?? fallbackId;
  const errorId = errors?.length ? `${id}-error` : undefined;
  return (
    <div className={className}>
      <Label htmlFor={id} {...labelProps} />
      <Textarea id={id} aria-invalid={errorId ? true : undefined} aria-describedby={errorId} {...textareaProps} />
      <div className="min-h-[32px] px-4 pb-3 pt-1">{errorId ? <ErrorList id={errorId} errors={errors} /> : null}</div>
    </div>
  );
}

export function CheckboxField({
  labelProps,
  buttonProps,
  errors,
  className,
}: {
  labelProps: JSX.IntrinsicElements["label"];
  buttonProps: Omit<CheckboxProps, "type" | "onCheckedChange"> & {
    name?: string;
    onChange?: (checked: boolean) => void;
  };
  errors?: ListOfErrors;
  className?: string;
}) {
  const fallbackId = useId();
  const id = buttonProps.id ?? fallbackId;
  const errorId = errors?.length ? `${id}-error` : undefined;

  return (
    <div className={className}>
      <div className="flex gap-2">
        <Checkbox
          id={id}
          name={buttonProps.name}
          checked={buttonProps.checked}
          defaultChecked={buttonProps.defaultChecked}
          disabled={buttonProps.disabled}
          required={buttonProps.required}
          aria-invalid={errorId ? true : undefined}
          aria-describedby={errorId}
          onCheckedChange={buttonProps.onChange}
        />
        <Label htmlFor={id} className="self-center text-body-xs text-muted-foreground" {...labelProps} />
      </div>
      <div className="px-4 pb-3 pt-1">{errorId ? <ErrorList id={errorId} errors={errors} /> : null}</div>
    </div>
  );
}
