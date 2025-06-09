import fetch from 'node-fetch';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000';
const COOKIE_FILE = './cookies.txt';

async function login() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'adminpassword',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Login failed: ${error.message || response.statusText}`);
    }

    // Extract cookies from headers
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      fs.writeFileSync(COOKIE_FILE, setCookieHeader);
      console.log('Login successful, cookies saved');
      return setCookieHeader;
    } else {
      // Get individual cookie values instead
      const cookieHeader = [];
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') {
          cookieHeader.push(value);
        }
      });
      
      if (cookieHeader.length > 0) {
        fs.writeFileSync(COOKIE_FILE, cookieHeader.join(';'));
        console.log('Login successful, cookies saved');
        return cookieHeader.join(';');
      } else {
        console.log('No cookies found in headers:', response.headers);
        throw new Error('No cookies received from login');
      }
    }
  } catch (error) {
    console.error('Login error:', error.message);
    process.exit(1);
  }
}

async function makeRequest(url, options = {}) {
  let cookieHeader;
  try {
    if (fs.existsSync(COOKIE_FILE)) {
      cookieHeader = fs.readFileSync(COOKIE_FILE, 'utf8');
    }
  } catch (error) {
    console.warn('Could not read cookies file:', error.message);
  }

  const headers = options.headers || {};
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Request failed: ${data.message || response.statusText}`);
    }
    
    return data;
  } catch (error) {
    console.error(`Error in request to ${url}:`, error.message);
    throw error;
  }
}

async function getTasks() {
  try {
    const tasks = await makeRequest('/api/tasks');
    console.log('Tasks fetched successfully:');
    console.log(JSON.stringify(tasks, null, 2));
    return tasks;
  } catch (error) {
    console.error('Failed to fetch tasks:', error.message);
  }
}

async function main() {
  // First login
  await login();
  
  // Now get tasks
  const tasks = await getTasks();
  
  console.log(`Total tasks: ${tasks ? tasks.length : 0}`);
}

main();