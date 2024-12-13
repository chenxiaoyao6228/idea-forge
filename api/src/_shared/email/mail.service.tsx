import { Injectable } from "@nestjs/common";
import { createTransport } from "nodemailer";
import { Template as RegisterEmail } from "./templates/RegisterEmail";
import { Template as ResetPasswordEmail } from "./templates/ResetPasswordEmail";
import { render } from "jsx-email";

// jsx-email: https://jsx.email/docs/email-providers#nodemailer
@Injectable()
export class MailService {
  private readonly from = `Idea Forge<${process.env.EMAIL_FROM}>`; // 'Name<sender email>'
  private transporter = createTransport({
    host: process.env.EMAIL_HOST,
    port: Number.parseInt(process.env.EMAIL_PORT || "465", 10),
    secure: process.env.EMAIL_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false, // Use this for development only
    },
  });

  /**
   * Send email
   * @param options Email options
   * - html: HTML format email content, for rich text email clients
   * - text: Plain text format email content, for clients that don't support HTML or users who disabled HTML emails
   * Providing both html and text is best practice to ensure emails display properly across all clients
   */
  async sendEmail({
    ...options
  }: {
    to: string;
    subject: string;
  } & { html: string; text: string }) {
    const email = {
      from: this.from,
      ...options,
    };

    if (process.env.NODE_ENV === "development") {
      console.log("Email sent:", email.text);
      return {} as const;
    }

    try {
      await this.transporter.sendMail(email);
      return {} as const;
    } catch (error) {
      console.error("Error sending email:", (error as Error).message);
      throw error;
      // TODO: Log error
    }
  }

  async sendRegistrationEmail(email: string, code: string) {
    try {
      const html = await render(<RegisterEmail code={code} email={email} />);

      const text = `Welcome to Idea Forge! Your registration verification code is: ${code}. Please use this code to complete your registration.`;

      return this.sendEmail({
        to: email,
        subject: "[Idea Forge] Complete Your Registration",
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
      const html = await render(<ResetPasswordEmail code={code} email={email} />);
      const text = `Your password reset verification code is: ${code}`;
      return this.sendEmail({
        to: email,
        subject: "[Idea Forge] Password Reset Verification Code",
        text,
        html,
      });
    } catch (error) {
      console.error("Error sending password reset email:", (error as Error).message);
      throw error;
    }
  }
}
