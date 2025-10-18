const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  console.log('📋 Listing available Gemini models...\n');

  const apiKey = 'AIzaSyCc3hO-VuWCLUKEQKBjNH7l3dSoGy21oZw';
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try different model names
    const modelNames = [
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.0-pro',
      'models/gemini-pro',
      'models/gemini-1.5-flash',
    ];

    for (const modelName of modelNames) {
      console.log(`\n🧪 Testing model: ${modelName}`);
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hello, test message');
        const response = await result.response;
        console.log(`✅ ${modelName} - WORKS!`);
        console.log(`   Response: ${response.text().substring(0, 50)}...`);
        break; // Stop after first working model
      } catch (e) {
        console.log(`❌ ${modelName} - ${e.message.split('\n')[0]}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listModels();
