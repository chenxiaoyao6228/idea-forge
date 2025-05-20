import React from "react";
import { Body, Button, Container, Head, Hr, Html, Link, Preview, Section, Text, Tailwind } from "jsx-email";
import { EmailTemplateProps } from "../type";

interface TemplateProps extends EmailTemplateProps {
  firstName: string;
  lastName: string;
}

export const templateName = "BatmanEmail";

export const Template = ({ firstName, lastName, t }: TemplateProps) => (
  <Html>
    <Head />
    <Preview>
      This is our email preview text for {firstName} {lastName}
    </Preview>
    <Tailwind
      config={{
        theme: {
          extend: {
            colors: {
              customBackground: "#f6f9fc",
              customContainer: "#ffffff",
              customText: "#777",
              customButton: "#777",
              customButtonText: "#fff",
              customHr: "#e6ebf1",
            },
          },
        },
      }}
    >
      <Body className="bg-customBackground font-sans">
        <Container className="bg-customContainer mx-auto mb-16 p-5">
          <Section className="px-12">
            <Text className="text-customText text-lg leading-6 text-left">This is our email body text</Text>
            <Button
              width={100}
              height={30}
              href="https://example.com"
              className="bg-customButton text-customButtonText font-bold py-2.5 px-4 rounded text-center"
            >
              Action Button
            </Button>
            <Hr className="border-customHr my-5" />
            <Text className="text-customText text-lg leading-6 text-left">
              This is text content with a{" "}
              <Link className="text-customText" href={`mailto:${firstName}@example.com`}>
                link
              </Link>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);
