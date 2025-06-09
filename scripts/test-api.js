import http from 'http';

async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log(`Headers: ${JSON.stringify(res.headers)}`);
        try {
          if (responseData && responseData.trim()) {
            const parsedData = JSON.parse(responseData);
            resolve({ statusCode: res.statusCode, headers: res.headers, data: parsedData });
          } else {
            resolve({ statusCode: res.statusCode, headers: res.headers, data: null });
          }
        } catch (e) {
          console.log('Failed to parse response as JSON:', e.message);
          console.log('Raw response:', responseData);
          resolve({ statusCode: res.statusCode, headers: res.headers, rawData: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function main() {
  try {
    // Login
    console.log('=== Attempting to login ===');
    const loginRes = await makeRequest({
      hostname: 'localhost',
      port: 5000, 
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, { email: 'admin@example.com', password: 'admin123' });
    
    console.log('Login response:', JSON.stringify(loginRes.data, null, 2));
    
    // Create a session cookie
    const cookies = loginRes.headers['set-cookie'];
    if (!cookies) {
      console.log('No session cookie found in response');
      return;
    }
    
    // Access tasks API
    console.log('\n=== Attempting to get tasks ===');
    const tasksRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/tasks',
      method: 'GET',
      headers: {
        'Cookie': cookies
      }
    });
    
    console.log('Tasks API response:', JSON.stringify(tasksRes.data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
