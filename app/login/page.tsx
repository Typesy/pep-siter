import Link from "next/link";
import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams?: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {};
  const nextPath = getSafeRedirectPath(params.next ?? null);

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <div className="mb-8">
        <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
          ← Home
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-gray-600">
          Use your email and password to access your account.
        </p>
      </div>
      <LoginForm nextPath={nextPath} />
    </main>
  );
}
