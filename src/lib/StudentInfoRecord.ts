// src/lib/StudentInfoRecord.ts
import { Student } from '@/lib/schema';

/**
 * 生徒情報を保持するイミュータブルなクラス。
 * 将来的にStudentスキーマを廃止してこちらに一本化することを想定しています。
 * 現状はStudentオブジェクトからの移し替えで生成します。
 */
export class StudentInfoRecord {
    // 内部変数
  private readonly _lineId: string;
  private readonly _name: string;
  private readonly _grade: string;
  private readonly _status: string;
  private readonly _masterId: string | null;

  /**
   * @param student 既存のStudentオブジェクトからの移し替え
   * @param masterId 外部システム連携用のマスターID。未取得の場合はnullを渡してください。
   */
  constructor(student: Student, masterId: string | null = null) {
    this._lineId = student.lineId;
    this._name = student.name;
    this._grade = student.grade;
    this._status = student.status;
    this._masterId = masterId;
  }

  /** LINEのユーザーID */
  get lineId(): string { return this._lineId; }

  /** 氏名 */
  get name(): string { return this._name; }

  /** 学年 */
  get grade(): string { return this._grade; }

  /** 在籍ステータス */
  get status(): string { return this._status; }

  /**
   * 外部システム連携用のマスターIDを取得します。
   * 未取得の場合はnullを返します。
   */
  get masterId(): string | null { return this._masterId; }
}