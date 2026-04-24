"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction } from "@/lib/auth/actions";
import { initialState, type AuthActionState } from "@/lib/auth/state";

type LoginFormProps = {
  nextPath: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const [state, formAction] = useActionState<AuthActionState, FormData>(
    signInAction,
    initialState,
  );

  return (
    <form action={formAction} className="mx-auto max-w-sm space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      <div>
        <label className="block text-sm font-medium text-gray-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        className="w-full rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        Sign in
      </button>
      <p className="text-center text-sm text-gray-600">
        No account?{" "}
        <Link className="font-medium text-gray-900 underline" href="/signup">
          Sign up
        </Link>
      </p>
    </form>
  );
}
