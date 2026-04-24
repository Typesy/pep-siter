import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProductListItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_cents: number;
  image_url: string | null;
};

export type ProductDetail = ProductListItem;

/**
 * Fetches active products for storefront listing.
 *
 * Returns:
 *   Promise<ProductListItem[]>: Active products sorted by newest first.
 */
export async function getActiveProducts(): Promise<ProductListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, description, price_cents, image_url")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Fetches one active product by slug.
 *
 * Args:
 *   slug (string): Product slug from the route.
 *
 * Returns:
 *   Promise<ProductDetail | null>: Active product row or null when not found.
 */
export async function getActiveProductBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, description, price_cents, image_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch product detail: ${error.message}`);
  }

  return data;
}
