// Simple test script for DOI auto-fill
// Run this in browser console (F12) after logging in

// Test 1: Check if endpoint exists
console.log('🔍 Testing DOI Auto-fill Endpoint...\n');

// Get token from localStorage
const token = localStorage.getItem('access_token');
if (!token) {
  console.error('❌ No access token found! Please login first.');
} else {
  console.log('✅ Token found:', token.substring(0, 20) + '...\n');
}

// Test 2: Call the API
const testDOI = 'https://arxiv.org/abs/1706.03762'; // Transformer paper

console.log(`📡 Calling API with DOI: ${testDOI}`);

fetch('http://localhost:3000/api/v1/papers/extract-metadata', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ input: testDOI })
})
.then(response => {
  console.log('\n📊 Response Status:', response.status);
  return response.json();
})
.then(data => {
  console.log('\n✅ SUCCESS! Metadata received:');
  console.log('Title:', data.title);
  console.log('Authors:', data.authors);
  console.log('Year:', data.publicationYear);
  console.log('\nFull response:', data);
})
.catch(error => {
  console.error('\n❌ ERROR:', error);
});

console.log('\n⏳ Waiting for response...');
