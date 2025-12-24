import { NextResponse } from 'next/server';
import { BadgeService, Badge } from '@/services/badgeService';

// Disable caching for dynamic data (though badges are static for a week, fetching fresh is safer)
export const dynamic = 'force-dynamic';

const badgeService = new BadgeService();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    try {
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
            exam: transform(result.exam),
            general: transform(result.general)
        });
    } catch (error) {
        console.error('Ranking Fetch Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
