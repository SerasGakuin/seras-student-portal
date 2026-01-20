import { NextResponse } from 'next/server';
import { BadgeService, Badge } from '@/services/badgeService';
import { authenticateRequest } from '@/lib/authUtils';
import { extractErrorMessage } from '@/lib/apiHandler';

// Disable caching for dynamic data (though badges are static for a week, fetching fresh is safer)
export const dynamic = 'force-dynamic';

const badgeService = new BadgeService();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    try {
        const auth = await authenticateRequest(request);
        if (!auth.isAuthenticated) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await badgeService.getWeeklyBadges(targetDate);

        const transform = (input: Record<string, Badge[]>) => {
            const out: Record<string, Partial<Badge>[]> = {};
            Object.entries(input).forEach(([name, list]) => {
                out[name] = list.map(b => ({
                    type: b.type,
                    rank: b.rank
                }));
            });
            return out;
        };

        return NextResponse.json({
            status: 'ok',
            data: {
                exam: transform(result.exam),
                general: transform(result.general),
                totalExamStudents: result.totalExamStudents,
                totalGeneralStudents: result.totalGeneralStudents,
                examRankings: result.examRankings,
                generalRankings: result.generalRankings,
                period: result.period,
            }
        });
    } catch (error) {
        console.error('Ranking Fetch Error:', error);
        return NextResponse.json({ status: 'error', message: extractErrorMessage(error) }, { status: 500 });
    }
}
