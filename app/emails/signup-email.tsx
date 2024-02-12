import * as E from "@react-email/components";

type SignupEmailProps = {
  onboardingUrl: string;
  otp: string;
};

export default function SignupEmail({ onboardingUrl, otp }: SignupEmailProps) {
  return (
    <E.Html lang="en" dir="ltr">
      <E.Container>
        <h1>
          <E.Text>Welcome to Shadownet!</E.Text>
        </h1>
        <p>
          <E.Text>
            Here&apos;s your verification code: <strong>{otp}</strong>
          </E.Text>
        </p>
        <p>
          <E.Text>Or click the link to get started:</E.Text>
        </p>
        <E.Link href={onboardingUrl}>{onboardingUrl}</E.Link>
      </E.Container>
    </E.Html>
  );
}
