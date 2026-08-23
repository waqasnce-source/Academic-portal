import { LoginForm } from "./_components/login-form";

const ERROR_MESSAGES: Record<string, string> = {
  invite_link_invalid: "This invitation link is invalid or has expired. Ask an administrator to resend it.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const rawError = searchParams.error;
  const errorCode = Array.isArray(rawError) ? rawError[0] : rawError;
  const initialError = errorCode ? ERROR_MESSAGES[errorCode] : undefined;

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-4 py-12">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, white 0, transparent 45%), radial-gradient(circle at 85% 75%, white 0, transparent 40%)",
        }}
      />
      <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500" />
      <LoginForm initialError={initialError} />
    </div>
  );
}
