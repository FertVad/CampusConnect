import React from 'react';
import { Grade, Subject } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { calculateGPA } from '@/lib/utils';
import { BookOpen } from 'lucide-react';

interface GradeListProps {
  grades: Grade[];
  subjects: Subject[];
}

const GradeList: React.FC<GradeListProps> = ({ grades, subjects }) => {
  // Helper function to find subject name by ID
  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : `Subject ${subjectId}`;
  };
  
  // Group grades by subject
  const gradesBySubject: Record<string, Grade[]> = {};
  
  grades.forEach(grade => {
    if (!gradesBySubject[grade.subjectId]) {
      gradesBySubject[grade.subjectId] = [];
    }
    gradesBySubject[grade.subjectId].push(grade);
  });
  
  // Calculate GPA for all subjects
  const overallGPA = parseFloat(calculateGPA(grades));
  
  // Calculate color based on GPA
  const getGpaColor = (gpa: number) => {
    if (gpa >= 3.5) return 'text-success';
    if (gpa >= 2.5) return 'text-primary';
    if (gpa >= 1.5) return 'text-warning';
    return 'text-error';
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-heading">Overall GPA</CardTitle>
          <div className={`text-2xl font-bold ${getGpaColor(overallGPA)}`}>
            {overallGPA}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-neutral-500">
            Based on {grades.length} grade entries across {Object.keys(gradesBySubject).length} subjects.
          </div>
        </CardContent>
      </Card>
      
      {Object.keys(gradesBySubject).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-neutral-500">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
            <p>No grades available yet.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(gradesBySubject).map(([subjectId, subjectGrades]) => {
          const subjectGpa = parseFloat(calculateGPA(subjectGrades));
          
          return (
            <Card key={subjectId}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-md font-heading">
                  {getSubjectName(subjectId)}
                </CardTitle>
                <div className={`text-lg font-bold ${getGpaColor(subjectGpa)}`}>
                  GPA: {subjectGpa}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Max Score</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Comments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjectGrades.map((grade) => {
                      const percentage = Math.round((grade.score / grade.maxScore) * 100);
                      
                      return (
                        <TableRow key={grade.id}>
                          <TableCell>
                            {grade.assignmentId ? `Assignment ${grade.assignmentId}` : 'Other Assessment'}
                          </TableCell>
                          <TableCell>{grade.score}</TableCell>
                          <TableCell>{grade.maxScore}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-neutral-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${percentage >= 90 ? 'bg-success' : percentage >= 70 ? 'bg-primary' : percentage >= 50 ? 'bg-warning' : 'bg-error'}`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm">{percentage}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[240px] truncate">{grade.comments || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default GradeList;
