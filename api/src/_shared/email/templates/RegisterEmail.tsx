import React from "react";
import { Body, Button, Container, Head, Html, Preview, Section, Text } from "jsx-email";
import { EmailTemplateProps } from "../type";

interface TemplateProps extends EmailTemplateProps {
  email: string;
  code: string;
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
};

const box = {
  padding: "0 48px",
};

const paragraph = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "24px",
  textAlign: "left" as const,
};

export const Template = ({ email = "test@test.com", code = "123456", t }: TemplateProps) => (
  <Html>
    <Head />
    <Preview>{t("Welcome to Idea Forge, {{email}}!", { email })}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={box}>
          <Text style={paragraph}>{t("Welcome to Idea Forge, {{email}}!", { email })}</Text>
          <Text style={paragraph}>
            {t("Your registration verification code is:")}
            <br />
          </Text>
          <Text style={{ fontSize: "24px", fontWeight: "bold" }}>{code}</Text>
          <Text style={paragraph}>{t("Please use this code to complete your registration.")}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);
