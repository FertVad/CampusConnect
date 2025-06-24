-- Convert integer primary keys to UUIDs
-- Requires pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USERS -------------------------------------------------
ALTER TABLE users ADD COLUMN id_new uuid DEFAULT gen_random_uuid();
UPDATE users SET id_new = gen_random_uuid();
CREATE TEMP TABLE map_users AS SELECT id AS old_id, id_new AS new_id FROM users;
ALTER TABLE users DROP CONSTRAINT users_pkey;
ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY(id_new);

-- SUBJECTS ----------------------------------------------
ALTER TABLE subjects ADD COLUMN id_new uuid DEFAULT gen_random_uuid();
UPDATE subjects SET id_new = gen_random_uuid();
CREATE TEMP TABLE map_subjects AS SELECT id AS old_id, id_new AS new_id FROM subjects;
ALTER TABLE subjects DROP CONSTRAINT subjects_pkey;
ALTER TABLE subjects ADD CONSTRAINT subjects_pkey PRIMARY KEY(id_new);

-- ENROLLMENTS -------------------------------------------
ALTER TABLE enrollments ADD COLUMN id_new uuid DEFAULT gen_random_uuid();
UPDATE enrollments SET id_new = gen_random_uuid();
ALTER TABLE enrollments DROP CONSTRAINT enrollments_pkey;
ALTER TABLE enrollments ADD CONSTRAINT enrollments_pkey PRIMARY KEY(id_new);

-- Add uuid columns referencing users and subjects
ALTER TABLE enrollments ADD COLUMN student_id_new uuid;
UPDATE enrollments e SET student_id_new = u.new_id FROM map_users u WHERE e.student_id::int = u.old_id;
ALTER TABLE enrollments ADD COLUMN subject_id_new uuid;
UPDATE enrollments e SET subject_id_new = s.new_id FROM map_subjects s WHERE e.subject_id = s.old_id;

-- Continue for other tables following the same pattern
-- (assignments, submissions, grades, requests, documents,
-- messages, notifications, specialties, courses, groups,
-- schedule_entries, imported_files, activity_logs, tasks,
-- curriculum_plans)
-- Each table should have an id_new column populated with
-- gen_random_uuid() and references updated via the mapping
-- tables created above.

-- After updating all references drop old columns and rename
-- the *_new columns to their original names. For example:
-- ALTER TABLE users DROP COLUMN id;
-- ALTER TABLE users RENAME COLUMN id_new TO id;
-- ALTER TABLE enrollments DROP COLUMN student_id;
-- ALTER TABLE enrollments RENAME COLUMN student_id_new TO student_id;
-- Repeat for each table and column.
