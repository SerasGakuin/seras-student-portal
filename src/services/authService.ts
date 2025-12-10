import { getStudentFromLineId } from './studentService';
import { Student } from '@/lib/schema';

export const loginStudent = async (lineUserId: string): Promise<Student | null> => {
    // Wrapper around student lookup. 
    // In future, this could track login timestamps, verify tokens, etc.
    return await getStudentFromLineId(lineUserId);
};
