import { db } from './index';
import * as schema from '@shared/schema';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';

// Function to create all necessary database tables based on schema
export async function migrateDatabase() {
  try {
    console.log('Starting database migration...');
    
    // Create the role enum type
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE role AS ENUM ('student', 'teacher', 'admin');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // Create the assignment_status enum type
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE assignment_status AS ENUM ('not_started', 'in_progress', 'completed', 'graded');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // Create the request_status enum type
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // Create the message_status enum type
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        password TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role role NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create subjects table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        teacher_id INTEGER REFERENCES users(id),
        room_number TEXT
      );
    `);

    // Create enrollments table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES users(id),
        subject_id INTEGER NOT NULL REFERENCES subjects(id)
      );
    `);

    // Create schedule_items table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS schedule_items (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER NOT NULL REFERENCES subjects(id),
        day_of_week INTEGER NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        room_number TEXT
      );
    `);

    // Create assignments table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        subject_id INTEGER NOT NULL REFERENCES subjects(id),
        due_date TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER NOT NULL REFERENCES users(id)
      );
    `);

    // Create submissions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER NOT NULL REFERENCES assignments(id),
        student_id INTEGER NOT NULL REFERENCES users(id),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        content TEXT,
        file_url TEXT,
        status assignment_status NOT NULL DEFAULT 'not_started',
        grade INTEGER,
        feedback TEXT
      );
    `);

    // Create grades table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS grades (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES users(id),
        subject_id INTEGER NOT NULL REFERENCES subjects(id),
        assignment_id INTEGER REFERENCES assignments(id),
        score INTEGER NOT NULL,
        max_score INTEGER NOT NULL,
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create requests table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        status request_status NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_by INTEGER REFERENCES users(id),
        resolved_at TIMESTAMP,
        resolution TEXT
      );
    `);

    // Create documents table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        file_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id)
      );
    `);

    // Create messages table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        from_user_id INTEGER NOT NULL REFERENCES users(id),
        to_user_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status message_status NOT NULL DEFAULT 'sent'
      );
    `);

    // Create notifications table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        related_id INTEGER,
        related_type TEXT
      );
    `);

    console.log('Database migration completed successfully');
    return true;
  } catch (error) {
    console.error('Database migration failed:', error);
    return false;
  }
}

// Seed the database with initial data
export async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    // Check if admin user exists
    const adminUser = await db.select().from(schema.users).where(sql`email = 'admin@eduportal.com'`).limit(1);
    
    if (adminUser.length > 0) {
      console.log('Admin user already exists, checking for test users...');
      
      // Check if we need to add test users (2 teachers and 3 students)
      const testUsers = await db.select().from(schema.users).where(
        sql`email IN ('teacher1@eduportal.com', 'teacher2@eduportal.com', 'student1@eduportal.com', 'student2@eduportal.com', 'student3@eduportal.com')`
      );
      
      if (testUsers.length === 5) {
        console.log('Test users already exist, skipping seed');
        return true;
      }
      
      console.log('Adding missing test users...');
    } else {
      console.log('Creating admin user and test users...');
    }
    
    // Hash password function (implemented in auth.ts, but we need it here for seeding)
    const hashPassword = async (password: string) => {
      const salt = await bcrypt.genSalt(10);
      return bcrypt.hash(password, salt);
    };
    
    // Insert admin user if it doesn't exist
    let adminUserRecord;
    if (adminUser.length === 0) {
      const adminPass = await hashPassword('admin123');
      const [newAdmin] = await db.insert(schema.users).values({
        firstName: 'Admin',
        lastName: 'User',
        password: adminPass,
        email: 'admin@eduportal.com',
        role: 'admin',
      }).returning();
      adminUserRecord = newAdmin;
      console.log('Created admin user');
    } else {
      adminUserRecord = adminUser[0];
    }
    
    // Insert teachers
    const teacherPass = await hashPassword('teacher123');
    
    // Check if test teachers exist first
    let teacher1, teacher2;
    const existingTeacher1 = await db.select().from(schema.users).where(sql`email = 'teacher1@eduportal.com'`).limit(1);
    const existingTeacher2 = await db.select().from(schema.users).where(sql`email = 'teacher2@eduportal.com'`).limit(1);
    
    if (existingTeacher1.length === 0) {
      const [newTeacher1] = await db.insert(schema.users).values({
        firstName: 'Иван',
        lastName: 'Петров',
        password: teacherPass,
        email: 'teacher1@eduportal.com',
        role: 'teacher',
      }).returning();
      teacher1 = newTeacher1;
      console.log('Created test teacher 1');
    } else {
      teacher1 = existingTeacher1[0];
    }
    
    if (existingTeacher2.length === 0) {
      const [newTeacher2] = await db.insert(schema.users).values({
        firstName: 'Мария',
        lastName: 'Смирнова',
        password: teacherPass,
        email: 'teacher2@eduportal.com',
        role: 'teacher',
      }).returning();
      teacher2 = newTeacher2;
      console.log('Created test teacher 2');
    } else {
      teacher2 = existingTeacher2[0];
    }
    
    // Check if the original teachers from the initial seed exist
    let teacher3;
    const existingOldTeacher = await db.select().from(schema.users).where(sql`email = 'david@eduportal.com'`).limit(1);
    
    if (existingOldTeacher.length === 0) {
      const [newTeacher3] = await db.insert(schema.users).values({
        firstName: 'David',
        lastName: 'Miller',
        password: teacherPass,
        email: 'david@eduportal.com',
        role: 'teacher',
      }).returning();
      teacher3 = newTeacher3;
    } else {
      teacher3 = existingOldTeacher[0];
    }
    
    // Insert students
    const studentPass = await hashPassword('student123');
    
    // Check if test students exist first
    let student1, student2, student3;
    const existingStudent1 = await db.select().from(schema.users).where(sql`email = 'student1@eduportal.com'`).limit(1);
    const existingStudent2 = await db.select().from(schema.users).where(sql`email = 'student2@eduportal.com'`).limit(1);
    const existingStudent3 = await db.select().from(schema.users).where(sql`email = 'student3@eduportal.com'`).limit(1);
    
    if (existingStudent1.length === 0) {
      const [newStudent1] = await db.insert(schema.users).values({
        firstName: 'Алексей',
        lastName: 'Иванов',
        password: studentPass,
        email: 'student1@eduportal.com',
        role: 'student',
      }).returning();
      student1 = newStudent1;
      console.log('Created test student 1');
    } else {
      student1 = existingStudent1[0];
    }
    
    if (existingStudent2.length === 0) {
      const [newStudent2] = await db.insert(schema.users).values({
        firstName: 'Екатерина',
        lastName: 'Сидорова',
        password: studentPass,
        email: 'student2@eduportal.com',
        role: 'student',
      }).returning();
      student2 = newStudent2;
      console.log('Created test student 2');
    } else {
      student2 = existingStudent2[0];
    }
    
    if (existingStudent3.length === 0) {
      const [newStudent3] = await db.insert(schema.users).values({
        firstName: 'Никита',
        lastName: 'Попов',
        password: studentPass,
        email: 'student3@eduportal.com',
        role: 'student',
      }).returning();
      student3 = newStudent3;
      console.log('Created test student 3');
    } else {
      student3 = existingStudent3[0];
    }
    
    // Check if the original students from the initial seed exist
    const existingOldStudent1 = await db.select().from(schema.users).where(sql`email = 'alex@eduportal.com'`).limit(1);
    const existingOldStudent2 = await db.select().from(schema.users).where(sql`email = 'emma@eduportal.com'`).limit(1);
    
    if (existingOldStudent1.length === 0) {
      await db.insert(schema.users).values({
        firstName: 'Alex',
        lastName: 'Johnson',
        password: studentPass,
        email: 'alex@eduportal.com',
        role: 'student',
      });
    }
    
    if (existingOldStudent2.length === 0) {
      await db.insert(schema.users).values({
        firstName: 'Emma',
        lastName: 'Wilson',
        password: studentPass,
        email: 'emma@eduportal.com',
        role: 'student',
      });
    }
    
    // Create subjects
    const [math] = await db.insert(schema.subjects).values({
      name: 'Calculus II',
      description: 'Advanced calculus concepts including integration techniques and applications.',
      teacherId: teacher1.id,
      roomNumber: '302',
    }).returning();
    
    const [chemistry] = await db.insert(schema.subjects).values({
      name: 'Chemistry',
      description: 'Introduction to chemical principles and laboratory techniques.',
      teacherId: teacher2.id,
      roomNumber: 'Lab 201',
    }).returning();
    
    const [physics] = await db.insert(schema.subjects).values({
      name: 'Physics 101',
      description: 'Fundamentals of mechanics, energy, and wave phenomena.',
      teacherId: teacher3.id,
      roomNumber: '105',
    }).returning();
    
    const [literature] = await db.insert(schema.subjects).values({
      name: 'English Literature',
      description: 'Critical analysis of classic and contemporary literature.',
      teacherId: teacher1.id,
      roomNumber: '201',
    }).returning();
    
    const [history] = await db.insert(schema.subjects).values({
      name: 'World History',
      description: 'Survey of major historical developments across civilizations.',
      teacherId: teacher2.id,
      roomNumber: '103',
    }).returning();
    
    // Create enrollments
    await db.insert(schema.enrollments).values([
      { studentId: student1.id, subjectId: math.id },
      { studentId: student1.id, subjectId: chemistry.id },
      { studentId: student1.id, subjectId: physics.id },
      { studentId: student1.id, subjectId: literature.id },
      { studentId: student1.id, subjectId: history.id },
      { studentId: student2.id, subjectId: math.id },
      { studentId: student2.id, subjectId: chemistry.id },
      { studentId: student2.id, subjectId: literature.id },
    ]);
    
    // Create schedule items
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await db.insert(schema.scheduleItems).values([
      {
        subjectId: math.id,
        dayOfWeek: 1, // Monday
        startTime: '09:00:00',
        endTime: '10:30:00',
        roomNumber: '302'
      },
      {
        subjectId: chemistry.id,
        dayOfWeek: 1, // Monday
        startTime: '11:00:00',
        endTime: '13:30:00',
        roomNumber: 'Lab 201'
      },
      {
        subjectId: physics.id,
        dayOfWeek: 1, // Monday
        startTime: '14:00:00',
        endTime: '15:30:00',
        roomNumber: '105'
      },
      {
        subjectId: literature.id,
        dayOfWeek: 2, // Tuesday
        startTime: '09:00:00',
        endTime: '10:30:00',
        roomNumber: '201'
      },
      {
        subjectId: history.id,
        dayOfWeek: 3, // Wednesday
        startTime: '13:00:00',
        endTime: '14:30:00',
        roomNumber: '103'
      }
    ]);
    
    // Create assignments
    const [mathAssignment] = await db.insert(schema.assignments).values({
      title: 'Math Analysis Midterm',
      description: 'Complete the midterm exam covering differential equations and vector calculus.',
      subjectId: math.id,
      dueDate: new Date(tomorrow.getTime()),
      createdBy: teacher1.id
    }).returning();
    
    const [literatureAssignment] = await db.insert(schema.assignments).values({
      title: 'Literature Review Essay',
      description: 'Write a 5-page analytical essay on the works of Shakespeare.',
      subjectId: literature.id,
      dueDate: new Date(tomorrow.getTime()),
      createdBy: teacher1.id
    }).returning();
    
    console.log('Database seeding completed successfully');
    return true;
  } catch (error) {
    console.error('Database seeding failed:', error);
    return false;
  }
}