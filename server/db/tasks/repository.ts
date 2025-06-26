import { db } from '../index';
import * as schema from '@shared/schema';
import { eq, and, or, desc, asc, sql, isNotNull } from 'drizzle-orm';
import { aliasedTable } from 'drizzle-orm/alias';
import { Task, InsertTask, UserSummary } from '@shared/schema';

export class TasksRepository {
  async getTasks(): Promise<(Task & { client?: UserSummary; executor?: UserSummary })[]> {
    const clientsTable = aliasedTable(schema.users, 'clients');
    const executorsTable = aliasedTable(schema.users, 'executors');

    const result = await db.select({
      id: schema.tasks.id,
      title: schema.tasks.title,
      description: schema.tasks.description,
      status: schema.tasks.status,
      priority: schema.tasks.priority,
      createdAt: schema.tasks.createdAt,
      updatedAt: schema.tasks.updatedAt,
      dueDate: schema.tasks.dueDate,
      clientId: schema.tasks.clientId,
      executorId: schema.tasks.executorId,
      clientFirstName: clientsTable.firstName,
      clientLastName: clientsTable.lastName,
      clientEmail: clientsTable.email,
      clientRole: clientsTable.role,
      executorFirstName: executorsTable.firstName,
      executorLastName: executorsTable.lastName,
      executorEmail: executorsTable.email,
      executorRole: executorsTable.role
    })
    .from(schema.tasks)
    .leftJoin(clientsTable, eq(schema.tasks.clientId, clientsTable.id))
    .leftJoin(executorsTable, eq(schema.tasks.executorId, executorsTable.id))
    .orderBy(
      sql`CASE
          WHEN ${schema.tasks.status} = 'new' THEN 1
          WHEN ${schema.tasks.status} = 'in_progress' THEN 2
          WHEN ${schema.tasks.status} = 'on_hold' THEN 3
          WHEN ${schema.tasks.status} = 'completed' THEN 4
          ELSE 5
        END`,
      sql`CASE
          WHEN ${schema.tasks.priority} = 'high' THEN 1
          WHEN ${schema.tasks.priority} = 'medium' THEN 2
          WHEN ${schema.tasks.priority} = 'low' THEN 3
          ELSE 4
        END`,
      desc(schema.tasks.createdAt)
    );

    return result.map(task => {
      const baseTask = {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        dueDate: task.dueDate,
        clientId: task.clientId,
        executorId: task.executorId
      };
      let client: UserSummary | undefined = undefined;
      if (task.clientFirstName && task.clientLastName && task.clientEmail && task.clientRole) {
        client = {
          id: task.clientId,
          firstName: task.clientFirstName,
          lastName: task.clientLastName,
          email: task.clientEmail,
          role: task.clientRole
        };
      }
      let executor: UserSummary | undefined = undefined;
      if (task.executorFirstName && task.executorLastName && task.executorEmail && task.executorRole) {
        executor = {
          id: task.executorId,
          firstName: task.executorFirstName,
          lastName: task.executorLastName,
          email: task.executorEmail,
          role: task.executorRole
        };
      }
      return { ...baseTask, client, executor };
    });
  }

  async getTask(id: string): Promise<(Task & { client?: UserSummary; executor?: UserSummary }) | undefined> {
    const clientsTable = aliasedTable(schema.users, 'clients');
    const executorsTable = aliasedTable(schema.users, 'executors');

    const result = await db.select({
      id: schema.tasks.id,
      title: schema.tasks.title,
      description: schema.tasks.description,
      status: schema.tasks.status,
      priority: schema.tasks.priority,
      createdAt: schema.tasks.createdAt,
      updatedAt: schema.tasks.updatedAt,
      dueDate: schema.tasks.dueDate,
      clientId: schema.tasks.clientId,
      executorId: schema.tasks.executorId,
      clientFirstName: clientsTable.firstName,
      clientLastName: clientsTable.lastName,
      clientEmail: clientsTable.email,
      clientRole: clientsTable.role,
      executorFirstName: executorsTable.firstName,
      executorLastName: executorsTable.lastName,
      executorEmail: executorsTable.email,
      executorRole: executorsTable.role
    })
    .from(schema.tasks)
    .leftJoin(clientsTable, eq(schema.tasks.clientId, clientsTable.id))
    .leftJoin(executorsTable, eq(schema.tasks.executorId, executorsTable.id))
    .where(eq(schema.tasks.id, id))
    .limit(1);

    if (result.length === 0) return undefined;
    const task = result[0];
    const baseTask = {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      dueDate: task.dueDate,
      clientId: task.clientId,
      executorId: task.executorId
    };
    let client: UserSummary | undefined = undefined;
    if (task.clientFirstName && task.clientLastName && task.clientEmail && task.clientRole) {
      client = {
        id: task.clientId,
        firstName: task.clientFirstName,
        lastName: task.clientLastName,
        email: task.clientEmail,
        role: task.clientRole
      };
    }
    let executor: UserSummary | undefined = undefined;
    if (task.executorFirstName && task.executorLastName && task.executorEmail && task.executorRole) {
      executor = {
        id: task.executorId,
        firstName: task.executorFirstName,
        lastName: task.executorLastName,
        email: task.executorEmail,
        role: task.executorRole
      };
    }
    return { ...baseTask, client, executor };
  }

  async getTasksByClient(clientId: string): Promise<(Task & { client?: UserSummary; executor?: UserSummary })[]> {
    const clientsTable = aliasedTable(schema.users, 'clients');
    const executorsTable = aliasedTable(schema.users, 'executors');

    const result = await db.select({
      id: schema.tasks.id,
      title: schema.tasks.title,
      description: schema.tasks.description,
      status: schema.tasks.status,
      priority: schema.tasks.priority,
      createdAt: schema.tasks.createdAt,
      updatedAt: schema.tasks.updatedAt,
      dueDate: schema.tasks.dueDate,
      clientId: schema.tasks.clientId,
      executorId: schema.tasks.executorId,
      clientFirstName: clientsTable.firstName,
      clientLastName: clientsTable.lastName,
      clientEmail: clientsTable.email,
      clientRole: clientsTable.role,
      executorFirstName: executorsTable.firstName,
      executorLastName: executorsTable.lastName,
      executorEmail: executorsTable.email,
      executorRole: executorsTable.role
    })
    .from(schema.tasks)
    .leftJoin(clientsTable, eq(schema.tasks.clientId, clientsTable.id))
    .leftJoin(executorsTable, eq(schema.tasks.executorId, executorsTable.id))
    .where(eq(schema.tasks.clientId, clientId))
    .orderBy(
      sql`CASE
          WHEN ${schema.tasks.status} = 'new' THEN 1
          WHEN ${schema.tasks.status} = 'in_progress' THEN 2
          WHEN ${schema.tasks.status} = 'on_hold' THEN 3
          WHEN ${schema.tasks.status} = 'completed' THEN 4
          ELSE 5
        END`,
      sql`CASE
          WHEN ${schema.tasks.priority} = 'high' THEN 1
          WHEN ${schema.tasks.priority} = 'medium' THEN 2
          WHEN ${schema.tasks.priority} = 'low' THEN 3
          ELSE 4
        END`,
      desc(schema.tasks.createdAt)
    );

    return result.map(task => {
      const baseTask = {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        dueDate: task.dueDate,
        clientId: task.clientId,
        executorId: task.executorId
      };
      let client: UserSummary | undefined = undefined;
      if (task.clientFirstName && task.clientLastName && task.clientEmail && task.clientRole) {
        client = {
          id: task.clientId,
          firstName: task.clientFirstName,
          lastName: task.clientLastName,
          email: task.clientEmail,
          role: task.clientRole
        };
      }
      let executor: UserSummary | undefined = undefined;
      if (task.executorFirstName && task.executorLastName && task.executorEmail && task.executorRole) {
        executor = {
          id: task.executorId,
          firstName: task.executorFirstName,
          lastName: task.executorLastName,
          email: task.executorEmail,
          role: task.executorRole
        };
      }
      return { ...baseTask, client, executor };
    });
  }

  async getTasksByExecutor(executorId: string): Promise<(Task & { client?: UserSummary; executor?: UserSummary })[]> {
    const clientsTable = aliasedTable(schema.users, 'clients');
    const executorsTable = aliasedTable(schema.users, 'executors');

    const result = await db.select({
      id: schema.tasks.id,
      title: schema.tasks.title,
      description: schema.tasks.description,
      status: schema.tasks.status,
      priority: schema.tasks.priority,
      createdAt: schema.tasks.createdAt,
      updatedAt: schema.tasks.updatedAt,
      dueDate: schema.tasks.dueDate,
      clientId: schema.tasks.clientId,
      executorId: schema.tasks.executorId,
      clientFirstName: clientsTable.firstName,
      clientLastName: clientsTable.lastName,
      clientEmail: clientsTable.email,
      clientRole: clientsTable.role,
      executorFirstName: executorsTable.firstName,
      executorLastName: executorsTable.lastName,
      executorEmail: executorsTable.email,
      executorRole: executorsTable.role
    })
    .from(schema.tasks)
    .leftJoin(clientsTable, eq(schema.tasks.clientId, clientsTable.id))
    .leftJoin(executorsTable, eq(schema.tasks.executorId, executorsTable.id))
    .where(eq(schema.tasks.executorId, executorId))
    .orderBy(
      sql`CASE
          WHEN ${schema.tasks.status} = 'new' THEN 1
          WHEN ${schema.tasks.status} = 'in_progress' THEN 2
          WHEN ${schema.tasks.status} = 'on_hold' THEN 3
          WHEN ${schema.tasks.status} = 'completed' THEN 4
          ELSE 5
        END`,
      sql`CASE
          WHEN ${schema.tasks.priority} = 'high' THEN 1
          WHEN ${schema.tasks.priority} = 'medium' THEN 2
          WHEN ${schema.tasks.priority} = 'low' THEN 3
          ELSE 4
        END`,
      desc(schema.tasks.createdAt)
    );

    return result.map(task => {
      const baseTask = {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        dueDate: task.dueDate,
        clientId: task.clientId,
        executorId: task.executorId
      };
      let client: UserSummary | undefined = undefined;
      if (task.clientFirstName && task.clientLastName && task.clientEmail && task.clientRole) {
        client = {
          id: task.clientId,
          firstName: task.clientFirstName,
          lastName: task.clientLastName,
          email: task.clientEmail,
          role: task.clientRole
        };
      }
      let executor: UserSummary | undefined = undefined;
      if (task.executorFirstName && task.executorLastName && task.executorEmail && task.executorRole) {
        executor = {
          id: task.executorId,
          firstName: task.executorFirstName,
          lastName: task.executorLastName,
          email: task.executorEmail,
          role: task.executorRole
        };
      }
      return { ...baseTask, client, executor };
    });
  }

  async getTasksByUser(userId: string): Promise<(Task & { client?: UserSummary; executor?: UserSummary })[]> {
    const clientsTable = aliasedTable(schema.users, 'clients');
    const executorsTable = aliasedTable(schema.users, 'executors');

    const result = await db.select({
      id: schema.tasks.id,
      title: schema.tasks.title,
      description: schema.tasks.description,
      status: schema.tasks.status,
      priority: schema.tasks.priority,
      createdAt: schema.tasks.createdAt,
      updatedAt: schema.tasks.updatedAt,
      dueDate: schema.tasks.dueDate,
      clientId: schema.tasks.clientId,
      executorId: schema.tasks.executorId,
      clientFirstName: clientsTable.firstName,
      clientLastName: clientsTable.lastName,
      clientEmail: clientsTable.email,
      clientRole: clientsTable.role,
      executorFirstName: executorsTable.firstName,
      executorLastName: executorsTable.lastName,
      executorEmail: executorsTable.email,
      executorRole: executorsTable.role
    })
    .from(schema.tasks)
    .leftJoin(clientsTable, eq(schema.tasks.clientId, clientsTable.id))
    .leftJoin(executorsTable, eq(schema.tasks.executorId, executorsTable.id))
    .where(or(eq(schema.tasks.clientId, userId), eq(schema.tasks.executorId, userId)))
    .orderBy(
      sql`CASE
          WHEN ${schema.tasks.status} = 'new' THEN 1
          WHEN ${schema.tasks.status} = 'in_progress' THEN 2
          WHEN ${schema.tasks.status} = 'on_hold' THEN 3
          WHEN ${schema.tasks.status} = 'completed' THEN 4
          ELSE 5
        END`,
      sql`CASE
          WHEN ${schema.tasks.priority} = 'high' THEN 1
          WHEN ${schema.tasks.priority} = 'medium' THEN 2
          WHEN ${schema.tasks.priority} = 'low' THEN 3
          ELSE 4
        END`,
      desc(schema.tasks.createdAt)
    );

    return result.map(task => {
      const baseTask = {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        dueDate: task.dueDate,
        clientId: task.clientId,
        executorId: task.executorId
      };
      let client: UserSummary | undefined = undefined;
      if (task.clientFirstName && task.clientLastName && task.clientEmail && task.clientRole) {
        client = {
          id: task.clientId,
          firstName: task.clientFirstName,
          lastName: task.clientLastName,
          email: task.clientEmail,
          role: task.clientRole
        };
      }
      let executor: UserSummary | undefined = undefined;
      if (task.executorFirstName && task.executorLastName && task.executorEmail && task.executorRole) {
        executor = {
          id: task.executorId,
          firstName: task.executorFirstName,
          lastName: task.executorLastName,
          email: task.executorEmail,
          role: task.executorRole
        };
      }
      return { ...baseTask, client, executor };
    });
  }

  async getTasksByStatus(status: string): Promise<Task[]> {
    return db.select().from(schema.tasks)
      .where(eq(schema.tasks.status, status as any))
      .orderBy(desc(schema.tasks.createdAt));
  }

  async getTasksDueSoon(days: number): Promise<(Task & { client?: UserSummary; executor?: UserSummary })[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + days);
    const clientsTable = aliasedTable(schema.users, 'clients');
    const executorsTable = aliasedTable(schema.users, 'executors');

    const result = await db.select({
      id: schema.tasks.id,
      title: schema.tasks.title,
      description: schema.tasks.description,
      status: schema.tasks.status,
      priority: schema.tasks.priority,
      createdAt: schema.tasks.createdAt,
      updatedAt: schema.tasks.updatedAt,
      dueDate: schema.tasks.dueDate,
      clientId: schema.tasks.clientId,
      executorId: schema.tasks.executorId,
      clientFirstName: clientsTable.firstName,
      clientLastName: clientsTable.lastName,
      clientEmail: clientsTable.email,
      clientRole: clientsTable.role,
      executorFirstName: executorsTable.firstName,
      executorLastName: executorsTable.lastName,
      executorEmail: executorsTable.email,
      executorRole: executorsTable.role
    })
    .from(schema.tasks)
    .leftJoin(clientsTable, eq(schema.tasks.clientId, clientsTable.id))
    .leftJoin(executorsTable, eq(schema.tasks.executorId, executorsTable.id))
    .where(
      and(
        or(
          eq(schema.tasks.status, 'new'),
          eq(schema.tasks.status, 'in_progress'),
          eq(schema.tasks.status, 'on_hold')
        ),
        and(
          isNotNull(schema.tasks.dueDate),
          sql`${schema.tasks.dueDate} <= ${future.toISOString()}`
        )
      )
    )
    .orderBy(
      asc(schema.tasks.dueDate),
      sql`CASE
          WHEN ${schema.tasks.priority} = 'high' THEN 1
          WHEN ${schema.tasks.priority} = 'medium' THEN 2
          WHEN ${schema.tasks.priority} = 'low' THEN 3
          ELSE 4
        END`
    );

    return result.map(task => {
      const baseTask = {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        dueDate: task.dueDate,
        clientId: task.clientId,
        executorId: task.executorId
      };
      let client: UserSummary | undefined = undefined;
      if (task.clientFirstName && task.clientLastName && task.clientEmail && task.clientRole) {
        client = {
          id: task.clientId,
          firstName: task.clientFirstName,
          lastName: task.clientLastName,
          email: task.clientEmail,
          role: task.clientRole
        };
      }
      let executor: UserSummary | undefined = undefined;
      if (task.executorFirstName && task.executorLastName && task.executorEmail && task.executorRole) {
        executor = {
          id: task.executorId,
          firstName: task.executorFirstName,
          lastName: task.executorLastName,
          email: task.executorEmail,
          role: task.executorRole
        };
      }
      return { ...baseTask, client, executor };
    });
  }

  async createTask(taskData: InsertTask): Promise<Task> {
    const [task] = await db.insert(schema.tasks)
      .values({
        ...taskData,
        clientId: taskData.clientId,
        executorId: taskData.executorId,
      })
      .returning();
    return task;
  }

  async updateTask(id: string, taskData: Partial<InsertTask>): Promise<Task | undefined> {
    const [task] = await db.update(schema.tasks)
      .set({
        ...taskData,
        updatedAt: new Date()
      })
      .where(eq(schema.tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = await db.delete(schema.tasks)
      .where(eq(schema.tasks.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}
