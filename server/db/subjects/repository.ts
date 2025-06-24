import { db } from '../index';
import * as schema from '@shared/schema';
import { eq } from 'drizzle-orm';
import { Subject, InsertSubject } from '@shared/schema';

export class SubjectsRepository {
  async getSubjects(): Promise<Subject[]> {
    return db.select().from(schema.subjects);
  }

  async getSubject(id: string): Promise<Subject | undefined> {
    const subjects = await db.select()
      .from(schema.subjects)
      .where(eq(schema.subjects.id, id))
      .limit(1);
    return subjects[0];
  }

  async getSubjectsByTeacher(teacherId: string): Promise<Subject[]> {
    return db.select()
      .from(schema.subjects)
      .where(eq(schema.subjects.teacherId, teacherId));
  }

  async createSubject(subjectData: InsertSubject): Promise<Subject> {
    const [subject] = await db.insert(schema.subjects)
      .values({
        ...subjectData,
        teacherId: subjectData.teacherId ?? undefined,
      })
      .returning();
    return subject;
  }

  async updateSubject(id: string, subjectData: Partial<InsertSubject>): Promise<Subject | undefined> {
    const [subject] = await db.update(schema.subjects)
      .set(subjectData)
      .where(eq(schema.subjects.id, id))
      .returning();
    return subject;
  }

  async deleteSubject(id: string): Promise<boolean> {
    const result = await db.delete(schema.subjects)
      .where(eq(schema.subjects.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}
