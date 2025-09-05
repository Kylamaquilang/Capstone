// src/utils/imageUtils.js

/**
 * Get the full URL for an image
 * @param {string} imagePath - The image path from the API
 * @returns {string} - The full URL for the image
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '/images/polo.png'; // default fallback
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // If it starts with '/', prepend the API base URL
  if (imagePath.startsWith('/')) {
    return `http://localhost:5000${imagePath}`;
  }
  
  // Otherwise, assume it's a relative path and prepend the API base URL
  return `http://localhost:5000/${imagePath}`;
};

/**
 * Get the full URL for a product image
 * @param {string} imagePath - The image path from the API
 * @returns {string} - The full URL for the product image
 */
export const getProductImageUrl = (imagePath) => {
  return getImageUrl(imagePath);
};

/**
 * Get the full URL for a profile image
 * @param {string} imagePath - The image path from the API
 * @returns {string} - The full URL for the profile image
 */
export const getProfileImageUrl = (imagePath) => {
  return getImageUrl(imagePath);
};
