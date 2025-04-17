import fetch from 'node-fetch';
import fs from 'fs';

// Хранение файла cookies для повторного использования сессии
const COOKIES_FILE = './cookies.txt';

async function login() {
  console.log('Attempting login...');
  
  try {
    const response = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@eduportal.com',
        password: 'admin123',
      }),
    });

    // Проверяем успешный вход
    if (!response.ok) {
      throw new Error(`Login failed with status: ${response.status}`);
    }

    // Извлекаем и сохраняем cookies для дальнейших запросов
    const cookies = response.headers.get('set-cookie');
    if (cookies) {
      fs.writeFileSync(COOKIES_FILE, cookies);
      console.log('Login successful, cookies saved.');
    } else {
      console.warn('Login successful but no cookies returned.');
    }

    return await response.json();
  } catch (error) {
    console.error('Login error:', error);
    process.exit(1);
  }
}

async function makeRequest(url, options = {}) {
  let cookies = '';
  
  // Пытаемся загрузить cookies из файла
  try {
    if (fs.existsSync(COOKIES_FILE)) {
      cookies = fs.readFileSync(COOKIES_FILE, 'utf8');
    }
  } catch (error) {
    console.warn('Failed to load cookies:', error);
  }
  
  // Добавляем cookies к запросу если они есть
  const headers = {
    'Accept': 'application/json',
    ...(cookies && { 'Cookie': cookies }),
    ...(options.headers || {})
  };
  
  try {
    const response = await fetch(`http://localhost:5000${url}`, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      console.error(`Request failed: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error('Response:', text);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Request error for ${url}:`, error);
    return null;
  }
}

async function getCurriculumPlans() {
  console.log('Fetching curriculum plans...');
  return await makeRequest('/api/curriculum-plans');
}

async function main() {
  // Пробуем войти в систему
  await login();
  
  // Сначала проверяем текущего пользователя
  console.log('Checking current authenticated user...');
  const user = await makeRequest('/api/user');
  if (user) {
    console.log('Authenticated as:', user);
    
    // После успешного входа получаем учебные планы
    const plans = await getCurriculumPlans();
    
    if (plans) {
      console.log(`Successfully retrieved ${plans.length} curriculum plans:`);
      console.log(JSON.stringify(plans, null, 2));
    } else {
      console.log('Failed to retrieve curriculum plans.');
    }
  } else {
    console.log('Not authenticated. Cannot fetch curriculum plans.');
  }
}

main().catch(console.error);