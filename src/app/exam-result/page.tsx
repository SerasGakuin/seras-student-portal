"use client";

import { useLiff } from "@/lib/liff";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { BackLink } from "@/components/ui/BackLink";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoginRequired } from "@/components/ui/LoginRequired";
import { PastExamResultList } from "@/features/exam-result/components/PastExamResultList";
import { PastExamResultForm } from "@/features/exam-result/components/PastExamResultForm";

/**
 * 過去問成績ページ
 * - 学生は過去問の成績を記録・管理できる
 * - 成績は学生ごとに保存される
 * - 成績の一覧表示と新規登録フォームを提供する
 * * 細かいコンポーネントはcomponents/ui/に定義されています。
 */
export default function PastExamResultsPage() {
  const { isLoading, student } = useLiff();

  if (isLoading) {
    return <LoadingOverlay />;
  }

  if (!student) {
    return <LoginRequired />;
  }

  return (
    <div className="container">
      <PageHeader
        title={
          <>
            <span className="brand">Seras学院</span> 過去問成績
          </>
        }
        subtitle="自分の過去問の成績を記録・管理できます"
      />
      <main>
        {/* 成績登録フォーム */}
          <PastExamResultForm />

        {/* 成績一覧 */}
        <PastExamResultList />

        <BackLink href="/">ポータルに戻る</BackLink>
      </main>
    </div>
  );
}
