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
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <LoginForm initialError={initialError} />
    </div>
  );
}
