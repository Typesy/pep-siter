"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction } from "@/lib/auth/actions";
import { initialState, type AuthActionState } from "@/lib/auth/state";

export function SignupForm() {
  const [state, formAction] = useActionState<AuthActionState, FormData>(
    signUpAction,
    initialState,
  );

  return (
    <form action={formAction} className="mx-auto max-w-sm space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700" htmlFor="full_name">
          Full name (optional)
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
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
          autoComplete="new-password"
          required
          minLength={6}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">At least 6 characters.</p>
      </div>
      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-green-700" role="status">
          {state.success}
        </p>
      ) : null}
      <button
        type="submit"
        className="w-full rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        Create account
      </button>
      <p className="text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link className="font-medium text-gray-900 underline" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
