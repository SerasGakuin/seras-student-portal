'use client';

import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download } from 'lucide-react';
import { MonthlyRankingData, RankedGroup, RankedStudent } from '@/types/analysis';
import { splitMinutes } from '@/lib/formatUtils';
import styles from './RankingPdfView.module.css';

interface RankingPdfViewProps {
    data: MonthlyRankingData;
}

// ============================================
// HeroCard（1位用 — 全幅）
// ============================================

function HeroCard({ student, maxMinutes }: {
    student: RankedStudent;
    maxMinutes: number;
}) {
    const { hours, mins } = splitMinutes(student.totalMinutes);
    const barPercent = maxMinutes > 0 ? (student.totalMinutes / maxMinutes) * 100 : 0;

    return (
        <div className={styles.heroCard}>
            <div className={styles.heroTop}>
                <span className={styles.heroRank}>{student.rank}</span>
                <span className={styles.heroName}>{student.name}さん</span>
                <span className={styles.heroGrade}>{student.grade}</span>
            </div>
            <div className={styles.heroBottom}>
                <div className={styles.heroHoursContainer}>
                    <span className={styles.heroHoursValue}>{hours}</span>
                    <span className={styles.heroHoursUnit}>h</span>
                    {mins > 0 && (
                        <>
                            <span className={styles.heroMinsValue}>{mins}</span>
                            <span className={styles.heroMinsUnit}>m</span>
                        </>
                    )}
                </div>
                <div className={styles.heroBarTrack}>
                    <div className={styles.heroBarFill} style={{ width: `${barPercent}%` }} />
                </div>
                <span className={styles.heroDays}>{student.attendanceDays}日通塾</span>
            </div>
        </div>
    );
}

// ============================================
// RunnerUpCard（2位3位用 — 半幅）
// ============================================

function RunnerUpCard({ student, maxMinutes }: {
    student: RankedStudent;
    maxMinutes: number;
}) {
    const { hours, mins } = splitMinutes(student.totalMinutes);
    const barPercent = maxMinutes > 0 ? (student.totalMinutes / maxMinutes) * 100 : 0;

    return (
        <div className={styles.runnerUpCard}>
            <div className={styles.runnerUpTop}>
                <span className={styles.runnerUpRank}>{student.rank}</span>
                <span className={styles.runnerUpName}>{student.name}さん</span>
                <span className={styles.runnerUpGrade}>{student.grade}</span>
            </div>
            <div className={styles.runnerUpHoursContainer}>
                <span className={styles.runnerUpHoursValue}>{hours}</span>
                <span className={styles.runnerUpHoursUnit}>h</span>
                {mins > 0 && (
                    <>
                        <span className={styles.runnerUpMinsValue}>{mins}</span>
                        <span className={styles.runnerUpMinsUnit}>m</span>
                    </>
                )}
            </div>
            <div className={styles.runnerUpBarTrack}>
                <div className={styles.runnerUpBarFill} style={{ width: `${barPercent}%` }} />
            </div>
        </div>
    );
}

// ============================================
// CompactRow（4位以降 — 罫線区切り行）
// ============================================

function CompactRow({ student, maxMinutes }: {
    student: RankedStudent;
    maxMinutes: number;
}) {
    const { hours, mins } = splitMinutes(student.totalMinutes);
    const barPercent = maxMinutes > 0 ? (student.totalMinutes / maxMinutes) * 100 : 0;

    return (
        <div className={styles.compactRow}>
            <span className={styles.compactRank}>{student.rank}</span>
            <span className={styles.compactName}>{student.name}さん</span>
            <span className={styles.compactGrade}>{student.grade}</span>
            <div className={styles.compactInlineBar}>
                <div className={styles.compactInlineBarFill} style={{ width: `${barPercent}%` }} />
            </div>
            <span className={styles.compactHours}>
                {hours}<span className={styles.compactHoursUnit}>h</span>
                {' '}{mins}<span className={styles.compactHoursUnit}>m</span>
            </span>
        </div>
    );
}

// ============================================
// グループランキング
// ============================================

function GroupRanking({ group }: { group: RankedGroup }) {
    if (group.students.length === 0 && group.totalStudents === 0) return null;

    const maxMinutes = Math.max(...group.students.map(s => s.totalMinutes), 1);

    const heroStudent = group.students.find(s => s.rank === 1);
    const runnerUps = group.students.filter(s => s.rank === 2 || s.rank === 3);
    const listStudents = group.students.filter(s => s.rank > 3);

    // サマリー計算
    const avgMinutes = group.students.length > 0
        ? Math.round(group.students.reduce((sum, s) => sum + s.totalMinutes, 0) / group.students.length)
        : 0;
    const { hours: avgHours, mins: avgMins } = splitMinutes(avgMinutes);

    return (
        <div className={styles.groupSection}>
            <h3 className={styles.groupHeader}>
                <span className={styles.groupHeaderAccent} />
                {group.label}
                {group.label === '受験生の部' && (
                    <span className={styles.groupSubtext}>(高3・既卒)</span>
                )}
            </h3>

            {group.students.length === 0 ? (
                <div className={styles.emptyGroup}>対象者がいません</div>
            ) : (
                <>
                    {/* 1位: HeroCard（全幅） */}
                    {heroStudent && (
                        <HeroCard student={heroStudent} maxMinutes={maxMinutes} />
                    )}

                    {/* 2位3位: RunnerUpCard（横並び） */}
                    {runnerUps.length > 0 && (
                        <div className={styles.runnerUpRow}>
                            {runnerUps.map((student) => (
                                <RunnerUpCard
                                    key={`${student.rank}-${student.name}`}
                                    student={student}
                                    maxMinutes={maxMinutes}
                                />
                            ))}
                        </div>
                    )}

                    {/* 4位以降: CompactRow（罫線行） */}
                    {listStudents.length > 0 && (
                        <div className={styles.compactList}>
                            {listStudents.map((student) => (
                                <CompactRow
                                    key={`${student.rank}-${student.name}`}
                                    student={student}
                                    maxMinutes={maxMinutes}
                                />
                            ))}
                        </div>
                    )}

                    {/* サマリーバー */}
                    <div className={styles.summaryBar}>
                        <span>
                            <span className={styles.summaryValue}>{group.students.length}</span>名表示 / 全<span className={styles.summaryValue}>{group.totalStudents}</span>名
                        </span>
                        <span>
                            表示者平均 <span className={styles.summaryValue}>{avgHours}h {avgMins}m</span>
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}

// ============================================
// メインコンポーネント
// ============================================

export function RankingPdfView({ data }: RankingPdfViewProps) {
    const pdfRef = useRef<HTMLDivElement>(null);
    const [downloading, setDownloading] = useState(false);

    const handleDownloadPdf = async () => {
        if (!pdfRef.current || downloading) return;
        setDownloading(true);

        try {
            // 1. html-to-image で高解像度 PNG キャプチャ
            const dataUrl = await toPng(pdfRef.current, {
                backgroundColor: '#f8fafc',
                pixelRatio: 3,
            });

            // 2. jspdf を動的インポート（SSR回避）
            const { jsPDF } = await import('jspdf');

            // 3. A4 PDF に埋め込み
            const pdf = new jsPDF('portrait', 'mm', 'a4');
            const pageWidth = 210;
            const pageHeight = 297;

            // 画像のアスペクト比を維持してA4に収める
            const img = new Image();
            img.src = dataUrl;
            await new Promise<void>((resolve) => {
                img.onload = () => resolve();
            });

            const imgAspect = img.height / img.width;
            const pdfImgWidth = pageWidth;
            const pdfImgHeight = pdfImgWidth * imgAspect;

            if (pdfImgHeight <= pageHeight) {
                pdf.addImage(dataUrl, 'PNG', 0, 0, pdfImgWidth, pdfImgHeight);
            } else {
                const scale = pageHeight / pdfImgHeight;
                const scaledWidth = pdfImgWidth * scale;
                const xOffset = (pageWidth - scaledWidth) / 2;
                pdf.addImage(dataUrl, 'PNG', xOffset, 0, scaledWidth, pageHeight);
            }

            // 4. ダウンロード
            pdf.save(`学習時間ランキング_${data.monthLabel}.pdf`);
        } catch (err) {
            console.error('PDF generation failed:', err);
        } finally {
            setDownloading(false);
        }
    };

    const generatedDate = new Date(data.generatedAt).toLocaleDateString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div>
            {/* A4 プレビュー（スクロール可能） */}
            <div className={styles.scrollContainer}>
                <div ref={pdfRef} className={styles.pdfCanvas}>
                    {/* ダークヘッダー */}
                    <div className={styles.header}>
                        <div className={styles.headerLeft}>
                            <div className={styles.schoolName}>SERAS GAKUIN</div>
                            <h2 className={styles.title}>学習時間ランキング</h2>
                        </div>
                        <span className={styles.monthBadge}>{data.monthLabel}</span>
                    </div>

                    {/* 受験部門 */}
                    <GroupRanking group={data.examGroup} />

                    {/* 一般部門 */}
                    <GroupRanking group={data.generalGroup} />

                    {/* フッター */}
                    <div className={styles.footer}>
                        作成日: {generatedDate} &nbsp;&bull;&nbsp; Seras学院
                    </div>
                </div>
            </div>

            {/* PDF保存ボタン */}
            <div style={{ textAlign: 'center' }}>
                <button
                    className={styles.downloadButton}
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                >
                    <Download size={16} />
                    {downloading ? 'PDF生成中...' : 'PDF保存'}
                </button>
            </div>
        </div>
    );
}
