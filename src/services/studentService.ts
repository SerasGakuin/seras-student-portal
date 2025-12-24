import { Student } from '@/lib/schema';
import { GoogleSheetStudentRepository } from '@/repositories/googleSheets/GoogleSheetStudentRepository';
// We should use dependency injection ideally, but for now we instantiate directly
// or use a singleton pattern if needed. Since Next.js service layer is stateless functions
// instantiation per request or static instance is fine.
// But since Repository has internal caching (unstable_cache), instantiation is cheap.

const repository = new GoogleSheetStudentRepository();

export const getStudentFromLineId = async (lineId: string): Promise<Student | null> => {
    return repository.findById(lineId);
};

export const getStudentsByNames = async (names: string[]): Promise<Map<string, { grade: string }>> => {
    return repository.findByNames(names);
};

export const getPrincipal = async (): Promise<Student | null> => {
    return repository.findPrincipal();
};

