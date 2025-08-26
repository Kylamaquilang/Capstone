// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Student ID validation (adjust pattern as needed)
export const validateStudentId = (studentId) => {
  // Basic validation - adjust regex pattern based on your student ID format
  const studentIdRegex = /^[A-Z0-9]{8,12}$/;
  return studentIdRegex.test(studentId);
};

// Password validation
export const validatePassword = (password) => {
  return password && password.length >= 6;
};

// Name validation
export const validateName = (name) => {
  return name && name.trim().length >= 2 && name.trim().length <= 50;
};

// Price validation
export const validatePrice = (price) => {
  const numPrice = parseFloat(price);
  return !isNaN(numPrice) && numPrice >= 0;
};

// Stock validation
export const validateStock = (stock) => {
  const numStock = parseInt(stock);
  return !isNaN(numStock) && numStock >= 0;
};

// Quantity validation
export const validateQuantity = (quantity) => {
  const numQuantity = parseInt(quantity);
  return !isNaN(numQuantity) && numQuantity > 0;
};

// Size validation
export const validateSize = (size) => {
  if (!size) return true; // Size is optional
  const validSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  return validSizes.includes(size.toUpperCase());
};

// Category validation
export const validateCategory = (category) => {
  if (!category) return true; // Category is optional
  return category.trim().length > 0 && category.trim().length <= 50;
};

// Image URL validation
export const validateImageUrl = (imageUrl) => {
  if (!imageUrl) return true; // Image is optional
  try {
    const url = new URL(imageUrl);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

// Generic string validation
export const validateString = (str, minLength = 1, maxLength = 255) => {
  return str && str.trim().length >= minLength && str.trim().length <= maxLength;
};

// Phone number validation
export const validatePhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Date validation
export const validateDate = (date) => {
  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj);
};

// ID validation
export const validateId = (id) => {
  const numId = parseInt(id);
  return !isNaN(numId) && numId > 0;
};

// Pagination validation
export const validatePagination = (page, limit) => {
  const numPage = parseInt(page) || 1;
  const numLimit = parseInt(limit) || 10;
  return {
    page: Math.max(1, numPage),
    limit: Math.min(100, Math.max(1, numLimit))
  };
};

