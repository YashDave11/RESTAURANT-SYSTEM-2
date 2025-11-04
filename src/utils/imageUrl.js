// Helper function to get the correct image URL
export const getImageUrl = (imageUrl) => {
  if (!imageUrl) return null;

  // If it's already a full URL (Cloudinary), return as is
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  // If it's a relative path, prepend the API URL
  const apiUrl = import.meta.env.VITE_API_URL || "";
  return `${apiUrl}${imageUrl}`;
};

// Helper function with fallback placeholder
export const getImageUrlWithFallback = (
  imageUrl,
  placeholder = "https://via.placeholder.com/300x200?text=No+Image"
) => {
  return getImageUrl(imageUrl) || placeholder;
};
