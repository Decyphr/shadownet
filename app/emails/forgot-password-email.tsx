import { Container, Html, Link, Text } from "@react-email/components";

export default function ForgotPasswordEmail({
  onboardingUrl,
  otp,
}: {
  onboardingUrl: string;
  otp: string;
}) {
  return (
    <Html lang="en" dir="ltr">
      <Container>
        <h1>
          <Text>Epic Notes Password Reset</Text>
        </h1>
        <p>
          <Text>
            Here&apos;s your verification code: <strong>{otp}</strong>
          </Text>
        </p>
        <p>
          <Text>Or click the link:</Text>
        </p>
        <Link href={onboardingUrl}>{onboardingUrl}</Link>
      </Container>
    </Html>
  );
}
