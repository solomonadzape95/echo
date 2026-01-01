/**
 * Generate a URL-friendly slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug by appending a number if needed
 */
export async function generateUniqueSlug(
  baseSlug: string,
  checkUnique: (slug: string) => Promise<boolean>,
  maxAttempts: number = 10
): Promise<string> {
  let slug = baseSlug;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const isUnique = await checkUnique(slug);
    if (isUnique) {
      return slug;
    }
    attempts++;
    slug = `${baseSlug}-${attempts}`;
  }

  // If we can't generate a unique slug, append timestamp
  return `${baseSlug}-${Date.now()}`;
}

