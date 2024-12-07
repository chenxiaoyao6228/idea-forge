import React from "react";
import { Body, Container, Head, Html, Preview, Section, Text } from "jsx-email";

interface TemplateProps {
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

export const Template = ({ email = "test@test.com", code = "123456" }: TemplateProps) => (
  <Html>
    <Head />
    <Preview>Password Reset for {email}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={box}>
          <Text style={paragraph}>Hello,</Text>
          <Text style={paragraph}>
            You have requested to reset your password. Your verification code is:
            <br />
          </Text>
          <Text style={{ fontSize: "24px", fontWeight: "bold" }}>{code}</Text>
          <Text style={paragraph}>Please use this code to complete your password reset process.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);
