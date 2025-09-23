// Test script to debug bulk upload
// Run this in browser console to test the upload endpoint

const testUpload = async () => {
  // Create a test CSV file
  const csvContent = `student_id,first_name,last_name,email,degree,status
20240001,John,Doe,john.doe@example.com,BSIT,regular
20240002,Jane,Smith,jane.smith@example.com,BSED,regular`;
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const file = new File([blob], 'test.csv', { type: 'text/csv' });
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    console.log('🧪 Testing upload...');
    const response = await fetch('http://localhost:5000/api/students/test-upload', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    console.log('📥 Upload result:', result);
    
    if (response.ok) {
      console.log('✅ Upload test successful!');
    } else {
      console.log('❌ Upload test failed:', result);
    }
  } catch (error) {
    console.error('❌ Upload test error:', error);
  }
};

// Run the test
testUpload();
