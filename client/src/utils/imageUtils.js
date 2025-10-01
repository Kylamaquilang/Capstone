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
  if (!imagePath || imagePath === 'null' || imagePath === 'undefined') {
    console.log('No image path provided, using default');
    return '/images/polo.png'; // default fallback
  }
  
  // Check for known missing files and provide fallback
  const missingImages = [
    'product-1759125441920-962749394.png',
    'product-1759125302247-365339742.webp'
  ];
  
  const fileName = imagePath.split('/').pop(); // Extract filename
  if (missingImages.includes(fileName)) {
    console.log('Using fallback for missing image:', fileName);
    return '/images/polo.png'; // fallback for missing images
  }
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // If it already starts with '/uploads/', return as is with API base URL
  if (imagePath.startsWith('/uploads/')) {
    const fullUrl = `${getApiBaseUrl()}${imagePath}`;
    console.log('Generated uploads URL:', fullUrl);
    return fullUrl;
  }
  
  // If it starts with '/', prepend the API base URL
  if (imagePath.startsWith('/')) {
    const fullUrl = `${getApiBaseUrl()}${imagePath}`;
    console.log('Generated absolute URL:', fullUrl);
    return fullUrl;
  }
  
  // Otherwise, assume it's a raw filename and prepend /uploads/
  const fullUrl = `${getApiBaseUrl()}/uploads/${imagePath}`;
  console.log('Generated filename URL:', fullUrl);
  return fullUrl;
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
