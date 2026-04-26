import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div className="apollo-panel p-8">
      <h1
        className="mb-1 text-2xl"
        style={{ fontWeight: 600, letterSpacing: "-0.2px" }}
      >
        Create your account
      </h1>
      <p className="mb-6 text-sm text-apollo-mute">
        Greenfield team members only.
      </p>

      <SignupForm />

      <div className="mt-6 text-sm text-apollo-mute">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-apollo-accent hover:underline"
          style={{ fontWeight: 600 }}
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
