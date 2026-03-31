// src/app/exam-result-form/hooks/usePastExamResults.ts

import { useState } from 'react';

/** 成績一覧の1件分のデータ */
export interface PastExamResultItem {
    recordId: number;
    universityName: string;
    subjectName: string;
    year: number;
    termName: string;
    totalScore: number | null;
    memo: string | null;
    regUtcMs: number;
}

/** モックデータ（実APIが繋がるまでの仮データ） */
const MOCK_RESULTS: PastExamResultItem[] = [
    {
        recordId: 1,
        universityName: '大阪大学',
        subjectName: '数学',
        year: 2024,
        termName: '前期',
        totalScore: 85,
        memo: '大問3が難しかった',
        regUtcMs: Date.now() - 1000 * 60 * 60 * 12, // 12時間前
    },
    {
        recordId: 2,
        universityName: '京都大学',
        subjectName: '英語',
        year: 2023,
        termName: '前期',
        totalScore: 72,
        memo: null,
        regUtcMs: Date.now() - 1000 * 60 * 60 * 48, // 48時間前
    },
];

/** 削除可能とみなす登録からの経過時間（ミリ秒） */
const DELETABLE_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * 登録から24時間以内かどうかを判定します。
 * UIでの削除ボタン表示制御に使用します。
 * @param regUtcMs 登録日時（UTCミリ秒）
 */
function isDeletable(regUtcMs: number): boolean {
    return Date.now() - regUtcMs < DELETABLE_DURATION_MS;
}

/**
 * 過去問成績の一覧取得・削除を管理するカスタムフックです。
 * 現在はモックデータを使用しています。
 * APIが実装され次第、fetchに差し替えてください。
 */
export function usePastExamResults() {
    // 成績一覧データ
    const [results, setResults] = useState<PastExamResultItem[]>(MOCK_RESULTS);
    // 検索クエリ
    const [searchQuery, setSearchQuery] = useState('');
    // 削除処理中のレコードID（ローディング制御に使用）
    const [deletingId, setDeletingId] = useState<number | null>(null);
    // 削除確認ポップアップの対象レコードID（nullなら非表示）
    const [confirmId, setConfirmId] = useState<number | null>(null);

    /**
     * 検索クエリで絞り込んだ成績一覧を返します。
     * 大学名・科目名・試験回・メモのいずれかに検索クエリが含まれるものを返します。
     */
    const filteredResults = results.filter(r =>
        [r.universityName, r.subjectName, r.termName, r.memo]
            .some(v => v?.includes(searchQuery))
    );

    /**
     * 各レコードが削除可能かどうかを判定したMapを返します。
     * コンポーネント側でisDeletableを直接呼ばなくて済むようにします。
     */
    const deletableMap = new Map(
        results.map(r => [r.recordId, isDeletable(r.regUtcMs)])
    );

    /**
     * 削除確認ポップアップを表示します。
     * @param recordId 削除対象のレコードID
     */
    const handleDeleteClick = (recordId: number) => {
        setConfirmId(recordId);
    };

    /**
     * 削除確認ポップアップをキャンセルします。
     */
    const handleDeleteCancel = () => {
        setConfirmId(null);
    };

    /**
     * 削除を実行します。
     * 削除成功後は一覧からそのレコードを除去します。
     * 削除失敗時はアラートを表示します。
     * TODO: 実APIのエンドポイントに差し替えてください。
     */
    const handleDeleteConfirm = async () => {
        if (confirmId === null) return;
        setDeletingId(confirmId);
        setConfirmId(null);
        try {
            // TODO: APIリクエストに差し替え
            await new Promise(resolve => setTimeout(resolve, 500));
            setResults(prev => prev.filter(r => r.recordId !== confirmId));
        } catch {
            alert('削除に失敗しました。');
        } finally {
            setDeletingId(null);
        }
    };

    return {
        /** 検索後の成績一覧 */
        filteredResults,
        /** レコードIDをキーとした削除可否Map */
        deletableMap,
        /** 検索クエリ */
        searchQuery,
        /** 検索クエリを更新する関数 */
        setSearchQuery,
        /** 削除処理中のレコードID */
        deletingId,
        /** 削除確認ポップアップの対象レコードID */
        confirmId,
        /** 削除ボタン押下時の処理 */
        handleDeleteClick,
        /** 削除確認ポップアップのキャンセル処理 */
        handleDeleteCancel,
        /** 削除確認後の実行処理 */
        handleDeleteConfirm,
    };
}