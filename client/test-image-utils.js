import { getImageUrl } from './src/utils/imageUtils.js';

console.log('Testing getImageUrl function:');
console.log('Input: /uploads/product-1759409341646-602838420.png');
console.log('Output:', getImageUrl('/uploads/product-1759409341646-602838420.png'));

console.log('\nTesting with null:');
console.log('Input: null');
console.log('Output:', getImageUrl(null));

console.log('\nTesting with undefined:');
console.log('Input: undefined');
console.log('Output:', getImageUrl(undefined));

console.log('\nTesting with empty string:');
console.log('Input: ""');
console.log('Output:', getImageUrl(''));
