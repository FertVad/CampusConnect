import http from 'http';

// Function to make HTTP requests
function makeRequest(options, data = null) {
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
          const parsedData = JSON.parse(responseData);
          resolve({ statusCode: res.statusCode, headers: res.headers, data: parsedData, cookies: res.headers['set-cookie'] });
        } catch (e) {
          console.log('Response is not valid JSON:', responseData.slice(0, 200) + '...');
          resolve({ statusCode: res.statusCode, headers: res.headers, data: responseData, cookies: res.headers['set-cookie'] });
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
    // Login first
    console.log('Logging in...');
    
    const loginResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, { email: 'admin@example.com', password: 'admin123' });
    
    if (loginResponse.statusCode !== 200) {
      console.error('Login failed:', loginResponse.data);
      return;
    }
    
    console.log('Login successful!');
    
    // Get the session cookie
    const cookies = loginResponse.cookies;
    if (!cookies) {
      console.error('No cookies received from login');
      return;
    }
    
    // Try to fetch tasks
    console.log('\nFetching tasks...');
    const tasksResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/tasks',
      method: 'GET',
      headers: {
        'Cookie': cookies
      }
    });
    
    console.log(`\nTasks response status: ${tasksResponse.statusCode}`);
    if (tasksResponse.statusCode === 200) {
      console.log('Tasks data:', JSON.stringify(tasksResponse.data, null, 2));
    } else {
      console.error('Error fetching tasks:', tasksResponse.data);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
