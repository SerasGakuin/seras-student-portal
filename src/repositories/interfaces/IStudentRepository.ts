import { Student } from '@/lib/schema';

export interface IStudentRepository {
    /**
     * Finds a student by their LINE ID.
     * @param lineId The LINE User ID.
     * @returns The student object or null if not found.
     */
    findById(lineId: string): Promise<Student | null>;

    /**
     * Finds all students.
     * @returns A map of lineId to Student objects.
     */
    findAll(): Promise<Record<string, Student>>;

    /**
     * Finds students by name logic (handles multiple variations).
     * @param names List of names to search for.
     * @returns Map of OriginalName -> { grade: string }
     */
    findByNames(names: string[]): Promise<Map<string, { grade: string }>>;

    /**
     * Finds the Principal (School Manager) account.
     * @returns The student object for the principal or null.
     */
    findPrincipal(): Promise<Student | null>;
}
