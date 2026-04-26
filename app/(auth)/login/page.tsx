import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ confirm?: string }>;
}) {
  const params = await searchParams;
  const showConfirmNotice = params.confirm === "1";

  return (
    <div className="apollo-panel p-8">
      <h1
        className="mb-1 text-2xl"
        style={{ fontWeight: 600, letterSpacing: "-0.2px" }}
      >
        Sign in
      </h1>
      <p className="mb-6 text-sm text-apollo-mute">
        Welcome back to your Greenfield portfolio.
      </p>

      {showConfirmNotice ? (
        <div
          className="mb-5 rounded-md border p-3 text-sm"
          style={{
            borderColor: "#d6e6dc",
            background: "#eaf2ed",
            color: "#1f5d3f",
          }}
        >
          Account created. Check your email for a confirmation link, then sign
          in below.
        </div>
      ) : null}

      <LoginForm />

      <div className="mt-6 text-sm text-apollo-mute">
        New to Apollo?{" "}
        <Link
          href="/signup"
          className="text-apollo-accent hover:underline"
          style={{ fontWeight: 600 }}
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}
