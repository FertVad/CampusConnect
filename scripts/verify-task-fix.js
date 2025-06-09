import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
let axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true
});

async function login() {
  try {
    const response = await axiosInstance.post('/api/auth/login', {
      email: 'admin@example.com',
      password: 'adminpassword'
    });
    
    console.log('Login successful');
    
    // Store cookies in the axiosInstance for subsequent requests
    axiosInstance.defaults.headers.Cookie = response.headers['set-cookie'];
    
    return response.data;
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function getTasks() {
  try {
    const response = await axiosInstance.get('/api/tasks');
    console.log('Tasks API response:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error fetching tasks:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('Authentication failed. Trying to login again...');
      await login();
      return getTasks();
    }
    throw error;
  }
}

async function main() {
  try {
    // Login first
    await login();
    
    // Then get tasks
    const tasks = await getTasks();
    
    console.log(`Total tasks: ${tasks ? tasks.length : 0}`);
  } catch (error) {
    console.error('Script failed:', error.message);
  }
}

main();