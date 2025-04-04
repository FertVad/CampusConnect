import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Получаем dirname для ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Путь к файлу
const filePath = path.join(__dirname, 'server/auth.ts');

// Чтение содержимого файла
let content = fs.readFileSync(filePath, 'utf8');

// Замена всех вхождений "await storage." на "await getStorage()."
content = content.replace(/await\s+storage\./g, 'await getStorage().');

// Замена всех остальных вхождений "storage." на "getStorage()."
content = content.replace(/(?<!await\s)storage\./g, 'getStorage().');

// Сохранение изменений
fs.writeFileSync(filePath, content);

console.log('Replacement completed successfully.');
