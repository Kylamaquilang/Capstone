// src/utils/imageUtils.js

// Get API base URL from environment or default
const getApiBaseUrl = () => {
  // In production, this should be your actual API URL
  if (typeof window !== 'undefined') {
    // Client-side: use the same host but different port
    const host = window.location.hostname;
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';
    return isLocalhost ? 'http://localhost:5000' : `https://${host}:5000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
};

/**
 * Get the full URL for an image
 * @param {string} imagePath - The image path from the API
 * @returns {string} - The full URL for the image
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) {
    return '/images/polo.png'; // default fallback
  }
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // If it already starts with '/uploads/', return as is with API base URL
  if (imagePath.startsWith('/uploads/')) {
    return `${getApiBaseUrl()}${imagePath}`;
  }
  
  // If it starts with '/', prepend the API base URL
  if (imagePath.startsWith('/')) {
    return `${getApiBaseUrl()}${imagePath}`;
  }
  
  // Otherwise, assume it's a raw filename and prepend /uploads/
  return `${getApiBaseUrl()}/uploads/${imagePath}`;
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
