// Remember to keep this line at the top of the file
import React from "react";
import { Inject, Injectable } from "@nestjs/common";
import { Resend } from "resend";
import { Template as RegisterEmail } from "./templates/RegisterEmail";
import { Template as ResetPasswordEmail } from "./templates/ResetPasswordEmail";
import { render } from "jsx-email";
import { I18nContextManager } from "../i18next/i18n.context";
import { ConfigService } from "@nestjs/config";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

// jsx-email: https://jsx.email/docs/email-providers#resend
@Injectable()
export class MailService {
  private resend: Resend | null = null;
  private shouldSendEmails = false;

  constructor(
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.initializeResend();
  }

  private initializeResend() {
    const apiKey = this.configService.get("RESEND_API_KEY");

    // Check if API key is set and not the default placeholder
    if (apiKey && apiKey !== "your_resend_api_key") {
      this.resend = new Resend(apiKey);
      this.shouldSendEmails = true;
      console.log("Resend initialized successfully");
    } else {
      console.log("Resend not initialized - API key is missing or set to default value");
      this.shouldSendEmails = false;
    }
  }

  /**
   * Send email
   * @param options Email options
   * - html: HTML format email content, for rich text email clients
   * - text: Plain text format email content, for clients that don't support HTML or users who disabled HTML emails
   * Providing both html and text is best practice to ensure emails display properly across all clients
   */
  async sendEmail({
    to,
    subject,
    html,
    text,
  }: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }) {
    // Always log the email text content (using both console.log for dev and logger for log files)
    console.log("Email content (text):", text);
    console.log("Email details:", { to, subject });
    this.logger.info("Email content", { to, subject, text });

    // If Resend is not configured or API key is default, skip sending
    if (!this.shouldSendEmails || !this.resend) {
      console.log("Email sending skipped - Resend not properly configured");
      this.logger.info("Email sending skipped - Resend not properly configured");
      return {} as const;
    }

    const fromAddress = this.configService.get("EMAIL_FROM");

    try {
      const result = await this.resend.emails.send({
        from: `Idea Forge <${fromAddress}>`,
        to,
        subject,
        html,
        text,
      });

      const { data, error } = result;

      if (error) {
        // TODO: better handling the send email error
        console.error("Error sending email via Resend:", error);
        throw new Error(error.message);
      }

      // Log successful email sending with message ID
      console.log("Email sent successfully via Resend:", {
        messageId: data?.id,
        to,
        subject,
        from: fromAddress,
        resendResult: result,
      });

      return {} as const;
    } catch (error) {
      console.error("Error sending email via Resend:", (error as Error).message);
      throw error;
    }
  }

  async sendRegistrationEmail(email: string, code: string) {
    const t = I18nContextManager.getT();
    try {
      const html = await render(<RegisterEmail code={code} email={email} t={t} />);

      const text = t("Welcome to Idea Forge! Your registration verification code is: {{code}}. Please use this code to complete your registration.", { code });

      return this.sendEmail({
        to: email,
        subject: t("Complete Your Registration"),
        text,
        html,
      });
    } catch (error) {
      console.error("Error sending registration email:", (error as Error).message);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, code: string) {
    try {
      const t = I18nContextManager.getT();
      const html = await render(<ResetPasswordEmail code={code} email={email} t={t} />);
      const text = t("Your password reset verification code is: {{code}}", { code });
      return this.sendEmail({
        to: email,
        subject: t("Password Reset Verification Code"),
        text,
        html,
      });
    } catch (error) {
      console.error("Error sending password reset email:", (error as Error).message);
      throw error;
    }
  }
}
