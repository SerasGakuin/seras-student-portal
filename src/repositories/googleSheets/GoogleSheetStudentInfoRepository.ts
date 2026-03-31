// src/repositories/googleSheets/GoogleSheetStudentInfoRepository.ts

import { IStudentInfoRepository } from '../interfaces/IStudentInfoRepository';
import { StudentInfoRecord } from '@/lib/StudentInfoRecord';
import { StudentSchema } from '@/lib/schema';
import { getGoogleSheets } from '@/lib/googleSheets';
import { unstable_cache } from 'next/cache';

/**
 * 生徒マスタースプレッドシートの列名定義。
 * シート上の列名が変更された場合は、ここだけを修正してください。
 */
const COLS = {
    LINE_ID:   '生徒LINEID',
    NAME:      '名前',
    GRADE:     '学年',
    STATUS:    'Status',
    MASTER_ID: 'マスターID',
} as const;

/**
 * Google Sheetsの生徒マスタースプレッドシートを参照して生徒情報を取得するリポジトリの実装です。
 * 取得結果はNext.jsのキャッシュ機構によって30秒間保持されます。
 */
export class GoogleSheetStudentInfoRepository implements IStudentInfoRepository {

    /**
     * 生徒マスタースプレッドシートの全データをキャッシュ付きで取得する内部関数です。
     * LINEのユーザーIDをキーとして、StudentInfoRecordを値とするオブジェクトを返します。
     * 
     * キャッシュキー: 'all-student-info-records-v1'
     * 再検証間隔: 30秒
     * タグ: 'student-data'（タグを指定してキャッシュを無効化できます）
     */
    private getCachedStudents = unstable_cache(
        async (): Promise<Record<string, StudentInfoRecord>> => {
            // 1. 環境変数からスプレッドシートIDを取得する
            const SPREADSHEET_ID = process.env.STUDENT_SPREADSHEET_ID;
            if (!SPREADSHEET_ID) return {};

            try {
                // 2. Google Sheets APIクライアントを取得して、シートの全データを取得する
                const sheets = await getGoogleSheets();
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: 'A:Z',
                });

                // 3. データが空の場合は空オブジェクトを返す
                const rows = response.data.values;
                if (!rows || rows.length === 0) return {};

                // 4. ヘッダ行をもとに列名と列番号の対応Mapを構築する
                //    シートの列順に依存しないように、動的に列番号を解決している
                const headers = rows[0];
                const colMap = new Map<string, number>();
                headers.forEach((h, i) => colMap.set(h, i));

                // 5. 必要な列がすべて存在するか確認する
                //    不足している場合はエラーログを出力して空オブジェクトを返す
                const missingCols = Object.values(COLS).filter(col => !colMap.has(col));
                if (missingCols.length > 0) {
                    console.error(`[GoogleSheetStudentInfoRepository] 必要な列が見つかりません: ${missingCols.join(', ')}`);
                    return {};
                }

                // 6. 各列の列番号を取得する
                const idxLineId   = colMap.get(COLS.LINE_ID)!;
                const idxName     = colMap.get(COLS.NAME)!;
                const idxGrade    = colMap.get(COLS.GRADE)!;
                const idxStatus   = colMap.get(COLS.STATUS)!;
                const idxMasterId = colMap.get(COLS.MASTER_ID)!;

                // 7. ヘッダ行を除いた各行を走査して、StudentInfoRecordを生成する
                const result: Record<string, StudentInfoRecord> = {};

                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];

                    // 7-1. LINEのユーザーIDが空の行はスキップする
                    if (!row[idxLineId]?.trim()) continue;

                    // 7-2. zodスキーマでバリデーションを行う
                    //      バリデーションに失敗した行はエラーログを出力してスキップする
                    const parsed = StudentSchema.safeParse({
                        lineId: row[idxLineId]?.trim()  || '',
                        name:   row[idxName]?.trim()    || '',
                        grade:  row[idxGrade]?.trim()   || '',
                        status: row[idxStatus]?.trim()  || '',
                    });

                    if (!parsed.success) {
                        console.error('[GoogleSheetStudentInfoRepository] バリデーションに失敗しました:', parsed.error);
                        continue;
                    }

                    // 7-3. マスターIDを取得する。未設定の場合はnullとして扱う
                    const masterId = row[idxMasterId]?.trim() || null;

                    // 7-4. StudentInfoRecordを生成してLINE IDをキーとして格納する
                    result[parsed.data.lineId] = new StudentInfoRecord(parsed.data, masterId);
                }

                return result;

            } catch (e) {
                // 予期しないエラーが発生した場合はエラーログを出力して空オブジェクトを返す
                console.error('[GoogleSheetStudentInfoRepository] データ取得中にエラーが発生しました:', e);
                return {};
            }
        },
        ['all-student-info-records-v1'],
        { revalidate: 30, tags: ['student-data'] }
    );

    /**
     * LINEのユーザーIDから生徒情報を取得します。
     * キャッシュされたデータから検索するため、高速に動作します。
     * 該当する生徒が存在しない場合はnullを返します。
     * @param lineId LINEのユーザーID
     */
    async findByLineId(lineId: string): Promise<StudentInfoRecord | null> {
        // キャッシュ済みの全生徒データからLINE IDで検索して返す
        const students = await this.getCachedStudents();
        return students[lineId] ?? null;
    }
}