import { Express } from "express";
import { getStorage } from "../storage";
import { insertAssignmentSchema, insertSubmissionSchema, insertGradeSchema } from "@shared/schema";
import { z } from "zod";
import type { RouteContext } from "./index";

export function registerAssignmentRoutes(app: Express, { authenticateUser, requireRole, upload }: RouteContext) {
  // Assignment Routes
  app.get('/api/assignments', authenticateUser, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const assignments = await getStorage().getAssignments();
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get('/api/assignments/:id', authenticateUser, async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const assignment = await getStorage().getAssignment(assignmentId);

      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get('/api/assignments/student/:studentId', authenticateUser, async (req, res) => {
    try {
      const studentId = req.params.studentId;

      if (req.user!.id !== studentId && req.user!.role === 'student') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const assignments = await getStorage().getAssignmentsByStudent(studentId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get('/api/assignments/student', authenticateUser, async (req, res) => {
    try {
      if (req.user!.role !== 'student') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Use the auth.uid() from the verified JWT instead of parsing integers
      const studentId = req.user!.id;

      const assignments = await getStorage().getAssignmentsByStudent(studentId);
      const submissions = await getStorage().getSubmissionsByStudent(studentId);

      const assignmentsWithSubmissions = assignments.map(assignment => {
        const submission = submissions.find(sub => sub.assignmentId === assignment.id);
        return {
          ...assignment,
          submission: submission || null
        };
      });

      res.json(assignmentsWithSubmissions);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });


  app.post('/api/assignments', authenticateUser, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const assignmentData = insertAssignmentSchema.parse({
        ...req.body,
        createdBy: req.user!.id
      });
      const assignment = await getStorage().createAssignment(assignmentData);

      const students = await getStorage().getStudentsBySubject(assignmentData.subjectId);
      for (const student of students) {
        await getStorage().createNotification({
          userId: student.id,
          title: "New Assignment",
          content: `A new assignment "${assignment.title}" has been posted for ${assignment.subjectId}.`,
          relatedId: assignment.id,
          relatedType: "assignment"
        });
      }

      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put('/api/assignments/:id', authenticateUser, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const assignment = await getStorage().getAssignment(assignmentId);

      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      if (req.user!.role === 'teacher' && assignment.createdBy !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const assignmentData = insertAssignmentSchema.partial().parse(req.body);
      const updatedAssignment = await getStorage().updateAssignment(assignmentId, assignmentData);

      res.json(updatedAssignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete('/api/assignments/:id', authenticateUser, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const assignment = await getStorage().getAssignment(assignmentId);

      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      if (req.user!.role === 'teacher' && assignment.createdBy !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await getStorage().deleteAssignment(assignmentId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Submission Routes
  app.get('/api/submissions/assignment/:assignmentId', authenticateUser, async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.assignmentId);

      const assignment = await getStorage().getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      if (req.user!.role === 'student') {
        const submission = await getStorage().getSubmissionByAssignmentAndStudent(assignmentId, req.user!.id);
        return res.json(submission ? [submission] : []);
      }

      if (req.user!.role === 'teacher' && assignment.createdBy !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const submissions = await getStorage().getSubmissionsByAssignment(assignmentId);
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get('/api/submissions/student/:studentId', authenticateUser, async (req, res) => {
    try {
      const studentId = req.params.studentId;

      if (req.user!.id !== studentId && req.user!.role === 'student') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const submissions = await getStorage().getSubmissionsByStudent(studentId);
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post('/api/submissions', authenticateUser, requireRole(['student']), upload.single('file'), async (req, res) => {
    try {
      const assignmentId = parseInt(req.body.assignmentId);
      const studentId = req.user!.id;

      const assignment = await getStorage().getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      const enrollments = await getStorage().getEnrollmentsByStudent(studentId);
      const isEnrolled = enrollments.some(e => e.subjectId === assignment.subjectId);

      if (!isEnrolled) {
        return res.status(403).json({ message: "You are not enrolled in this subject" });
      }

      const existingSubmission = await getStorage().getSubmissionByAssignmentAndStudent(assignmentId, studentId);

      const submissionData = {
        assignmentId,
        studentId,
        content: req.body.content || null,
        fileUrl: req.file ? `/uploads/${req.file.filename}` : (existingSubmission?.fileUrl || null),
        status: 'completed' as const
      };

      let submission;
      if (existingSubmission) {
        submission = await getStorage().updateSubmission(existingSubmission.id, submissionData);
      } else {
        submission = await getStorage().createSubmission(submissionData);

        const subject = await getStorage().getSubject(assignment.subjectId);
        if (subject?.teacherId && req.user) {
          await getStorage().createNotification({
            userId: subject.teacherId,
            title: "New Submission",
            content: `${req.user.firstName} ${req.user.lastName} has submitted ${assignment.title}.`,
            relatedId: submission.id,
            relatedType: "submission"
          });
        }
      }

      res.status(201).json(submission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put('/api/submissions/:id/grade', authenticateUser, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const submissionId = parseInt(req.params.id);
      const { grade, feedback } = req.body;

      const submission = await getStorage().getSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      const assignment = await getStorage().getAssignment(submission.assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      if (req.user!.role === 'teacher') {
        const subject = await getStorage().getSubject(assignment.subjectId);
        if (subject?.teacherId !== req.user!.id) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      const updatedSubmission = await getStorage().updateSubmission(submissionId, {
        grade: parseInt(grade),
        feedback,
        status: 'graded'
      });

      await getStorage().createGrade({
        studentId: submission.studentId,
        subjectId: assignment.subjectId,
        assignmentId: assignment.id,
        score: parseInt(grade),
        maxScore: 100,
        comments: feedback || null
      });

      await getStorage().createNotification({
        userId: submission.studentId,
        title: "Assignment Graded",
        content: `Your submission for "${assignment.title}" has been graded.`,
        relatedId: submission.id,
        relatedType: "submission"
      });

      res.json(updatedSubmission);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Grade Routes
  app.get('/api/grades/student/:studentId', authenticateUser, async (req, res) => {
    try {
      const studentId = req.params.studentId;

      if (req.user!.id !== studentId && req.user!.role === 'student') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const grades = await getStorage().getGradesByStudent(studentId);
      res.json(grades);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get('/api/grades/subject/:subjectId', authenticateUser, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const subjectId = parseInt(req.params.subjectId);

      if (req.user!.role === 'teacher') {
        const subject = await getStorage().getSubject(subjectId);
        if (subject?.teacherId !== req.user!.id) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      const grades = await getStorage().getGradesBySubject(subjectId);
      res.json(grades);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post('/api/grades', authenticateUser, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const gradeData = insertGradeSchema.parse(req.body);

      if (req.user!.role === 'teacher') {
        const subject = await getStorage().getSubject(gradeData.subjectId);
        if (subject?.teacherId !== req.user!.id) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      const grade = await getStorage().createGrade(gradeData);

      await getStorage().createNotification({
        userId: gradeData.studentId,
        title: "New Grade Posted",
        content: `A new grade has been posted for your ${gradeData.subjectId} course.`,
        relatedId: grade.id,
        relatedType: "grade"
      });

      res.status(201).json(grade);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put('/api/grades/:id', authenticateUser, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const gradeId = parseInt(req.params.id);
      const grade = await getStorage().getGrade(gradeId);

      if (!grade) {
        return res.status(404).json({ message: "Grade not found" });
      }

      if (req.user!.role === 'teacher') {
        const subject = await getStorage().getSubject(grade.subjectId);
        if (subject?.teacherId !== req.user!.id) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      const gradeData = insertGradeSchema.partial().parse(req.body);
      const updatedGrade = await getStorage().updateGrade(gradeId, gradeData);

      res.json(updatedGrade);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  // Teacher-specific assignments endpoint (teacher can view their assignments)
  app.get('/api/assignments/teacher/:teacherId', authenticateUser, async (req, res) => {
    console.log('🔍 [DEBUG] /api/assignments/teacher/:teacherId called');
    console.log('🔍 [DEBUG] teacherId param:', req.params.teacherId);
    console.log('🔍 [DEBUG] req.user:', req.user);
    try {
      const teacherId = req.params.teacherId;

      if (req.user!.id !== teacherId && req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const assignments = await getStorage().getAssignmentsByTeacher(teacherId);
      res.json(assignments);
    } catch (error) {
      console.log('🚨 [ERROR] Assignment teacher endpoint error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get('/api/assignments/teacher', authenticateUser, async (req, res) => {
    console.log('🔍 [DEBUG] /api/assignments/teacher called');
    console.log('🔍 [DEBUG] req.user:', req.user);
    try {
      if (req.user!.role !== 'teacher' && req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const assignments = await getStorage().getAssignmentsByTeacher(req.user!.id);

      const assignmentsWithDetails = await Promise.all(assignments.map(async assignment => {
        const submissions = await getStorage().getSubmissionsByAssignment(assignment.id);
        const subject = await getStorage().getSubject(assignment.subjectId);
        const students = await getStorage().getStudentsBySubject(assignment.subjectId);
        return {
          ...assignment,
          subject,
          submissions,
          studentCount: students.length
        };
      }));

      res.json(assignmentsWithDetails);
    } catch (error) {
      console.log('🚨 [ERROR] Assignment teacher endpoint error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });
}

