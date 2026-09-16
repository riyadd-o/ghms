/**
 * Helper to get optimized image URLs for Cloudinary and remote providers
 */
export function getOptimizedImageUrl(url?: string | null, width = 500): string {
  if (!url) return "";
  if (url.includes("res.cloudinary.com") && url.includes("/image/upload/")) {
    if (!url.includes("/image/upload/f_auto")) {
      return url.replace(
        "/image/upload/",
        `/image/upload/f_auto,q_auto,w_${width},c_fill/`
      );
    }
  }
  return url;
}
