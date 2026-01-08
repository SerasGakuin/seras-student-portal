import { ExitTimeFillService } from './exitTimeFillService';
import { EntryExitLog, EntryExitLogWithIndex, IOccupancyRepository } from '@/repositories/interfaces/IOccupancyRepository';
import { IStudentRepository } from '@/repositories/interfaces/IStudentRepository';
import { Student } from '@/types';

// Mock lineService
jest.mock('./lineService', () => ({
    lineService: {
        pushMessage: jest.fn().mockResolvedValue(undefined),
    },
}));

import { lineService } from './lineService';

describe('ExitTimeFillService', () => {
    let mockOccupancyRepo: jest.Mocked<IOccupancyRepository>;
    let mockStudentRepo: jest.Mocked<IStudentRepository>;
    let service: ExitTimeFillService;

    // Helper to create logs
    const createLog = (
        name: string,
        entryTime: string,
        exitTime: string | null,
        place: string = '1'
    ): EntryExitLog => ({
        name,
        entryTime,
        exitTime,
        place,
    });

    const createLogWithIndex = (
        name: string,
        entryTime: string,
        exitTime: string | null,
        place: string = '1',
        rowIndex: number = 0
    ): EntryExitLogWithIndex => ({
        ...createLog(name, entryTime, exitTime, place),
        rowIndex,
    });

    beforeEach(() => {
        jest.clearAllMocks();

        mockOccupancyRepo = {
            findAllLogs: jest.fn(),
            findAllLogsWithIndex: jest.fn(),
            findLogsByName: jest.fn(),
            updateExitTime: jest.fn(),
        };

        mockStudentRepo = {
            findAll: jest.fn(),
            findByLineId: jest.fn(),
        };

        service = new ExitTimeFillService(mockOccupancyRepo, mockStudentRepo);
    });

    describe('calculateStudentAverage', () => {
        it('過去7日間の平均滞在時間を計算する', () => {
            const now = new Date('2025-01-08T14:00:00+09:00'); // JST 23:00
            const logs: EntryExitLog[] = [
                // 1日前: 2時間
                createLog('田中', '2025-01-07T05:00:00Z', '2025-01-07T07:00:00Z'), // 14:00-16:00 JST
                // 2日前: 3時間
                createLog('田中', '2025-01-06T05:00:00Z', '2025-01-06T08:00:00Z'), // 14:00-17:00 JST
                // 3日前: 4時間
                createLog('田中', '2025-01-05T05:00:00Z', '2025-01-05T09:00:00Z'), // 14:00-18:00 JST
            ];

            const result = service.calculateStudentAverage(logs, '田中', now);

            // 平均: (120 + 180 + 240) / 3 = 180分 = 3時間
            expect(result).toBe(180);
        });

        it('過去7日間にデータがない場合は0を返す', () => {
            const now = new Date('2025-01-08T14:00:00+09:00');
            const logs: EntryExitLog[] = [
                // 10日前のログ（範囲外）
                createLog('田中', '2024-12-28T05:00:00Z', '2024-12-28T07:00:00Z'),
            ];

            const result = service.calculateStudentAverage(logs, '田中', now);

            expect(result).toBe(0);
        });

        it('exitTimeがないログは計算に含めない', () => {
            const now = new Date('2025-01-08T14:00:00+09:00');
            const logs: EntryExitLog[] = [
                createLog('田中', '2025-01-07T05:00:00Z', '2025-01-07T07:00:00Z'), // 2時間
                createLog('田中', '2025-01-06T05:00:00Z', null), // exitTimeなし
            ];

            const result = service.calculateStudentAverage(logs, '田中', now);

            // exitTimeなしのログは除外されるので、2時間のみ
            expect(result).toBe(120);
        });
    });

    describe('calculateGlobalAverage', () => {
        it('全生徒の過去7日間の平均滞在時間を計算する', () => {
            const now = new Date('2025-01-08T14:00:00+09:00');
            const logs: EntryExitLog[] = [
                createLog('田中', '2025-01-07T05:00:00Z', '2025-01-07T07:00:00Z'), // 2時間
                createLog('鈴木', '2025-01-07T05:00:00Z', '2025-01-07T08:00:00Z'), // 3時間
            ];

            const result = service.calculateGlobalAverage(logs, now);

            // 平均: (120 + 180) / 2 = 150分
            expect(result).toBe(150);
        });

        it('データがない場合はデフォルト値180分を返す', () => {
            const now = new Date('2025-01-08T14:00:00+09:00');
            const logs: EntryExitLog[] = [];

            const result = service.calculateGlobalAverage(logs, now);

            expect(result).toBe(180); // 3時間
        });
    });

    describe('calculateFilledExitTime', () => {
        it('入室時刻 + 平均滞在時間を返す', () => {
            const entryTime = new Date('2025-01-08T05:00:00Z'); // 14:00 JST
            const averageMinutes = 180; // 3時間

            const result = service.calculateFilledExitTime(entryTime, averageMinutes);

            // 14:00 + 3h = 17:00 JST = 08:00 UTC
            expect(result.toISOString()).toBe('2025-01-08T08:00:00.000Z');
        });

        it('22:00 JSTを超える場合は22:00 JSTで切り捨て', () => {
            const entryTime = new Date('2025-01-08T11:00:00Z'); // 20:00 JST
            const averageMinutes = 180; // 3時間 → 23:00 JST になるはず

            const result = service.calculateFilledExitTime(entryTime, averageMinutes);

            // 22:00 JST = 13:00 UTC
            expect(result.toISOString()).toBe('2025-01-08T13:00:00.000Z');
        });

        it('入室時刻が22:00 JST以降の場合は入室+1時間', () => {
            const entryTime = new Date('2025-01-08T13:30:00Z'); // 22:30 JST
            const averageMinutes = 180;

            const result = service.calculateFilledExitTime(entryTime, averageMinutes);

            // 22:30 + 1h = 23:30 JST = 14:30 UTC
            expect(result.toISOString()).toBe('2025-01-08T14:30:00.000Z');
        });
    });

    describe('getTodayUnfilledLogs', () => {
        it('当日の未退室ログのみを返す', async () => {
            // 現在時刻: 2025-01-08 23:00 JST
            jest.useFakeTimers().setSystemTime(new Date('2025-01-08T14:00:00Z'));

            const logsWithIndex: EntryExitLogWithIndex[] = [
                // 当日の未退室ログ
                createLogWithIndex('田中', '2025-01-08T05:00:00Z', null, '1', 0),
                // 当日の退室済みログ
                createLogWithIndex('鈴木', '2025-01-08T05:00:00Z', '2025-01-08T08:00:00Z', '1', 1),
                // 昨日の未退室ログ
                createLogWithIndex('佐藤', '2025-01-07T05:00:00Z', null, '1', 2),
            ];

            mockOccupancyRepo.findAllLogsWithIndex.mockResolvedValue(logsWithIndex);

            const result = await service.getTodayUnfilledLogs();

            expect(result).toHaveLength(1);
            expect(result[0].log.name).toBe('田中');
            expect(result[0].rowIndex).toBe(0);

            jest.useRealTimers();
        });
    });

    describe('fillAndNotify', () => {
        it('未退室ログを補完しLINE通知を送信する', async () => {
            jest.useFakeTimers().setSystemTime(new Date('2025-01-08T14:00:00Z'));

            const logsWithIndex: EntryExitLogWithIndex[] = [
                createLogWithIndex('田中', '2025-01-08T05:00:00Z', null, '2', 0),
            ];

            const allLogs: EntryExitLog[] = [
                createLog('田中', '2025-01-07T05:00:00Z', '2025-01-07T08:00:00Z'), // 過去ログ
                ...logsWithIndex,
            ];

            const students: Record<string, Student> = {
                tanaka: {
                    lineId: 'U1234567890',
                    name: '田中',
                    grade: '高3',
                    status: '在塾',
                },
            };

            mockOccupancyRepo.findAllLogsWithIndex.mockResolvedValue(logsWithIndex);
            mockOccupancyRepo.findAllLogs.mockResolvedValue(allLogs);
            mockStudentRepo.findAll.mockResolvedValue(students);
            mockOccupancyRepo.updateExitTime.mockResolvedValue(undefined);

            const result = await service.fillAndNotify();

            expect(result.filled).toBe(1);
            expect(result.notified).toBe(1);
            expect(result.errors).toHaveLength(0);

            // exitTime が更新されたことを確認（JST toString形式）
            expect(mockOccupancyRepo.updateExitTime).toHaveBeenCalledWith(
                0,
                expect.stringMatching(/^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4} \d{2}:\d{2}:\d{2} GMT\+0900 \(GMT\+09:00\)$/)
            );

            // LINE通知が送信されたことを確認
            expect(lineService.pushMessage).toHaveBeenCalledWith(
                'U1234567890',
                expect.stringContaining('2号館')
            );

            jest.useRealTimers();
        });

        it('lineIdがない生徒には通知をスキップする', async () => {
            jest.useFakeTimers().setSystemTime(new Date('2025-01-08T14:00:00Z'));

            const logsWithIndex: EntryExitLogWithIndex[] = [
                createLogWithIndex('山田', '2025-01-08T05:00:00Z', null, '1', 0),
            ];

            const students: Record<string, Student> = {
                yamada: {
                    lineId: '', // 空のlineId
                    name: '山田',
                    grade: '高2',
                    status: '在塾',
                },
            };

            mockOccupancyRepo.findAllLogsWithIndex.mockResolvedValue(logsWithIndex);
            mockOccupancyRepo.findAllLogs.mockResolvedValue([...logsWithIndex]);
            mockStudentRepo.findAll.mockResolvedValue(students);
            mockOccupancyRepo.updateExitTime.mockResolvedValue(undefined);

            const result = await service.fillAndNotify();

            expect(result.filled).toBe(1);
            expect(result.notified).toBe(0);
            expect(lineService.pushMessage).not.toHaveBeenCalled();

            jest.useRealTimers();
        });

        it('補完対象がない場合は何もしない', async () => {
            jest.useFakeTimers().setSystemTime(new Date('2025-01-08T14:00:00Z'));

            mockOccupancyRepo.findAllLogsWithIndex.mockResolvedValue([]);

            const result = await service.fillAndNotify();

            expect(result.filled).toBe(0);
            expect(result.notified).toBe(0);
            expect(mockOccupancyRepo.updateExitTime).not.toHaveBeenCalled();

            jest.useRealTimers();
        });
    });

    describe('buildNotificationMessage', () => {
        it('本館の場合は「本館」と表示', () => {
            const message = service.buildNotificationMessage('1');
            expect(message).toContain('本館');
            expect(message).not.toContain('2号館');
        });

        it('2号館の場合は「2号館」と表示', () => {
            const message = service.buildNotificationMessage('2');
            expect(message).toContain('2号館');
            expect(message).not.toContain('本館');
        });
    });
});
