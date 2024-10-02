import { Container, Html, Link, Text } from "@react-email/components";

type SignupEmailProps = {
  onboardingUrl: string;
  otp: string;
};

export default function SignupEmail({ onboardingUrl, otp }: SignupEmailProps) {
  return (
    <Html lang="en" dir="ltr">
      <Container>
        <h1>
          <Text>Welcome to Shadownet!</Text>
        </h1>
        <p>
          <Text>
            Here&apos;s your verification code: <strong>{otp}</strong>
          </Text>
        </p>
        <p>
          <Text>Or click the link to get started:</Text>
        </p>
        <Link href={onboardingUrl}>{onboardingUrl}</Link>
      </Container>
    </Html>
  );
}
