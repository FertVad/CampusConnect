// Скрипт для принудительного добавления учебных планов в базу данных
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
const { Pool } = pg;

(async () => {
  console.log('Starting curriculum plans seeding...');
  
  try {
    // Connect to database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    // Create drizzle instance
    const db = drizzle(pool);
    
    // Check if admin user exists
    const adminUserResult = await pool.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      ['admin@eduportal.com']
    );
    
    if (adminUserResult.rows.length === 0) {
      console.error('Admin user not found, cannot seed curriculum plans');
      await pool.end();
      return;
    }
    
    const adminId = adminUserResult.rows[0].id;
    
    // Check if curriculum_plans table exists
    const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'curriculum_plans'
      );
    `);
    
    if (!tableCheckResult.rows[0].exists) {
      console.error('Curriculum plans table does not exist');
      await pool.end();
      return;
    }
    
    // Check if the education_level enum type exists
    const enumCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_type
        WHERE typname = 'education_level'
      );
    `);
    
    if (!enumCheckResult.rows[0].exists) {
      console.error('Education level enum type does not exist. Creating it now...');
      await pool.query(`
        DO $$ BEGIN
          CREATE TYPE education_level AS ENUM ('СПО', 'ВО', 'Магистратура', 'Аспирантура');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      console.log('Created education_level enum type');
    }
    
    // Check if there are already curriculum plans
    const plansResult = await pool.query('SELECT COUNT(*) FROM curriculum_plans');
    
    if (parseInt(plansResult.rows[0].count) > 0) {
      console.log('Curriculum plans already exist, skipping insertion');
      await pool.end();
      return;
    }
    
    // Insert curriculum plans
    await pool.query(`
      INSERT INTO curriculum_plans 
      (specialty_name, specialty_code, years_of_study, education_level, description, created_by, start_year, end_year, education_form, created_at, updated_at)
      VALUES 
      ('Информатика и вычислительная техника', '09.03.01', 4, 'ВО', 'Бакалавриат по информатике и вычислительной технике', $1, 2023, 2027, 'Очная', NOW(), NOW()),
      ('Экономика', '38.03.01', 4, 'ВО', 'Бакалавриат по экономике', $1, 2023, 2027, 'Очная', NOW(), NOW()),
      ('Прикладная информатика', '09.04.03', 2, 'Магистратура', 'Магистратура по прикладной информатике', $1, 2023, 2025, 'Очная', NOW(), NOW())
    `, [adminId]);
    
    console.log('Successfully added curriculum plans');
    
    // Close connection pool
    await pool.end();
  } catch (error) {
    console.error('Error seeding curriculum plans:', error);
  }
})();