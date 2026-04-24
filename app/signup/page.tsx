import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <div className="mb-8">
        <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
          ← Home
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Create account</h1>
        <p className="mt-2 text-sm text-gray-600">
          Sign up to save orders and view order history later.
        </p>
      </div>
      <SignupForm />
    </main>
  );
}
