"use client";

import { useActionState } from "react";
import { loginAction, type AuthState } from "../actions";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    loginAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="font-label mb-1.5 block text-xs uppercase tracking-wider text-apollo-mute"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="apollo-input"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="font-label mb-1.5 block text-xs uppercase tracking-wider text-apollo-mute"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="apollo-input"
        />
      </div>

      {state?.error ? (
        <div
          className="rounded-md border p-3 text-sm"
          style={{
            borderColor: "#ecc4c0",
            background: "#fdf3f1",
            color: "#9b2f2f",
          }}
        >
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="apollo-btn w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
