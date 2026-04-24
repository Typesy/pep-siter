import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CartLink } from "@/components/cart/cart-link";
import { signOutAction } from "@/lib/auth/actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = Boolean(profile?.is_admin);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Pep Siter</h1>
      <p className="mt-3 text-sm text-gray-600">
        Research-products storefront (auth enabled; catalog and checkout in later
        phases).
      </p>
      <div className="mt-4">
        <Link className="text-sm font-medium text-gray-900 underline" href="/shop">
          Browse products
        </Link>
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-4 text-sm">
        <CartLink />
        {user ? (
          <>
            <span className="text-gray-700">Signed in as {user.email}</span>
            {isAdmin ? (
              <Link
                className="font-medium text-gray-900 underline"
                href="/admin"
              >
                Admin
              </Link>
            ) : null}
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded border border-gray-300 px-3 py-1.5 font-medium text-gray-800 hover:bg-gray-50"
              >
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link className="font-medium text-gray-900 underline" href="/login">
              Sign in
            </Link>
            <Link className="font-medium text-gray-900 underline" href="/signup">
              Sign up
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
