import http from 'http';
import { parse } from 'url';

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const cookies = res.headers['set-cookie'];
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        let parsedData;
        
        try {
          if (responseData && responseData.trim() && !responseData.includes('<!DOCTYPE html>')) {
            parsedData = JSON.parse(responseData);
          } else {
            parsedData = { raw: responseData.substring(0, 200) + '...' };
          }
        } catch (error) {
          console.error('Failed to parse response as JSON:', error.message);
          parsedData = { error: 'Invalid JSON', raw: responseData.substring(0, 200) + '...' };
        }
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          cookies,
          data: parsedData
        });
      });
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error.message);
      reject(error);
    });
    
    if (data) {
      const stringData = JSON.stringify(data);
      req.write(stringData);
    }
    
    req.end();
  });
}

async function main() {
  try {
    let sessionCookie;
    
    // Step 1: Login to get session cookie
    console.log('\n=== Step 1: Login ===');
    const loginResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: 'admin@example.com', 
      password: 'admin123'
    });
    
    console.log(`Login Status: ${loginResponse.statusCode}`);
    
    if (loginResponse.cookies) {
      sessionCookie = loginResponse.cookies[0].split(';')[0];
      console.log(`Session cookie: ${sessionCookie}`);
    } else {
      console.error('No session cookie received');
      return;
    }
    
    // Step 2: Get current user
    console.log('\n=== Step 2: Get current user ===');
    const userResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/user',
      method: 'GET',
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    console.log(`User API Status: ${userResponse.statusCode}`);
    console.log('User data:', userResponse.data);
    
    // Step 3: Get tasks
    console.log('\n=== Step 3: Get tasks ===');
    const tasksResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/tasks',
      method: 'GET',
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    console.log(`Tasks API Status: ${tasksResponse.statusCode}`);
    if (tasksResponse.statusCode === 200) {
      console.log('Tasks data:', JSON.stringify(tasksResponse.data, null, 2));
    } else {
      console.error('Failed to get tasks:', tasksResponse.data);
    }

    // Step 4: Try to create a task
    console.log('\n=== Step 4: Create task ===');
    const newTask = {
      title: "Test Task " + new Date().toISOString(),
      description: "This is a test task created via API",
      priority: "high",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      executorId: 2 // Assuming user ID 2 exists (a teacher)
    };
    
    const createTaskResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/tasks',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      }
    }, newTask);
    
    console.log(`Create Task Status: ${createTaskResponse.statusCode}`);
    console.log('Create Task Response:', createTaskResponse.data);
    
  } catch (error) {
    console.error('Error in test script:', error);
  }
}

main();