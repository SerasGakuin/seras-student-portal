/**
 * NightlyService テスト
 * 23:00 JST に実行される夜間バッチ処理のテスト
 */

import { NightlyService, NightlyResult } from './nightlyService';
import { ExitTimeFillService, FillResult } from './exitTimeFillService';

// Mock dependencies
const mockGetOccupancyData = jest.fn();
const mockUpdateBuildingStatus = jest.fn();

jest.mock('@/services/occupancyService', () => ({
    occupancyService: {
        getOccupancyData: (...args: unknown[]) => mockGetOccupancyData(...args),
        updateBuildingStatus: (...args: unknown[]) => mockUpdateBuildingStatus(...args),
    },
}));

// Mock ExitTimeFillService
jest.mock('./exitTimeFillService');

describe('NightlyService', () => {
    let service: NightlyService;
    let mockExitTimeFillService: jest.Mocked<ExitTimeFillService>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup ExitTimeFillService mock
        mockExitTimeFillService = {
            fillAndNotify: jest.fn(),
        } as unknown as jest.Mocked<ExitTimeFillService>;

        service = new NightlyService(mockExitTimeFillService);
    });

    describe('autoCloseBuilding2', () => {
        it('should close building 2 if it is open', async () => {
            mockGetOccupancyData.mockResolvedValue({
                building2: { isOpen: true, count: 0, members: [] },
            });
            mockUpdateBuildingStatus.mockResolvedValue(undefined);

            const result = await service.autoCloseBuilding2();

            expect(result.closed).toBe(true);
            expect(result.message).toContain('閉館しました');
            expect(mockUpdateBuildingStatus).toHaveBeenCalledWith({
                building: '2',
                isOpen: false,
                actorName: 'System (Auto-Close)',
            });
        });

        it('should not close building 2 if it is already closed', async () => {
            mockGetOccupancyData.mockResolvedValue({
                building2: { isOpen: false, count: 0, members: [] },
            });

            const result = await service.autoCloseBuilding2();

            expect(result.closed).toBe(false);
            expect(result.message).toContain('既に閉館');
            expect(mockUpdateBuildingStatus).not.toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            mockGetOccupancyData.mockRejectedValue(new Error('API Error'));

            const result = await service.autoCloseBuilding2();

            expect(result.closed).toBe(false);
            expect(result.error).toBe('API Error');
        });
    });

    describe('runAll', () => {
        it('should run both auto-close and fill-exit-time', async () => {
            // Setup mocks
            mockGetOccupancyData.mockResolvedValue({
                building2: { isOpen: true, count: 0, members: [] },
            });
            mockUpdateBuildingStatus.mockResolvedValue(undefined);

            const fillResult: FillResult = {
                filled: 3,
                notified: 2,
                errors: [],
            };
            mockExitTimeFillService.fillAndNotify.mockResolvedValue(fillResult);

            // Execute
            const result = await service.runAll();

            // Verify
            expect(result.autoClose.closed).toBe(true);
            expect(result.fillExitTime.filled).toBe(3);
            expect(result.fillExitTime.notified).toBe(2);
        });

        it('should continue fill-exit-time even if auto-close fails', async () => {
            // auto-close fails
            mockGetOccupancyData.mockRejectedValue(new Error('Auto-close failed'));

            // fill-exit-time succeeds
            const fillResult: FillResult = {
                filled: 1,
                notified: 1,
                errors: [],
            };
            mockExitTimeFillService.fillAndNotify.mockResolvedValue(fillResult);

            const result = await service.runAll();

            // auto-close should have error
            expect(result.autoClose.closed).toBe(false);
            expect(result.autoClose.error).toBe('Auto-close failed');

            // fill-exit-time should still succeed
            expect(result.fillExitTime.filled).toBe(1);
        });

        it('should continue auto-close even if fill-exit-time fails', async () => {
            // auto-close succeeds
            mockGetOccupancyData.mockResolvedValue({
                building2: { isOpen: true, count: 0, members: [] },
            });
            mockUpdateBuildingStatus.mockResolvedValue(undefined);

            // fill-exit-time fails
            mockExitTimeFillService.fillAndNotify.mockRejectedValue(
                new Error('Fill failed')
            );

            const result = await service.runAll();

            // auto-close should succeed
            expect(result.autoClose.closed).toBe(true);

            // fill-exit-time should have error
            expect(result.fillExitTime.filled).toBe(0);
            expect(result.fillExitTime.errors).toContain('Fill failed');
        });

        it('should return combined results with summary', async () => {
            mockGetOccupancyData.mockResolvedValue({
                building2: { isOpen: false, count: 0, members: [] },
            });

            const fillResult: FillResult = {
                filled: 5,
                notified: 4,
                errors: ['One student failed'],
            };
            mockExitTimeFillService.fillAndNotify.mockResolvedValue(fillResult);

            const result: NightlyResult = await service.runAll();

            expect(result.autoClose).toBeDefined();
            expect(result.fillExitTime).toBeDefined();
            expect(result.summary).toContain('自動閉館');
            expect(result.summary).toContain('退室補完');
        });
    });

    describe('generateSummary', () => {
        it('should generate correct summary message', async () => {
            mockGetOccupancyData.mockResolvedValue({
                building2: { isOpen: true, count: 0, members: [] },
            });
            mockUpdateBuildingStatus.mockResolvedValue(undefined);

            const fillResult: FillResult = {
                filled: 2,
                notified: 2,
                errors: [],
            };
            mockExitTimeFillService.fillAndNotify.mockResolvedValue(fillResult);

            const result = await service.runAll();

            expect(result.summary).toBe(
                '自動閉館: 実行 | 退室補完: 2件補完, 2件通知'
            );
        });

        it('should show skip status when building already closed', async () => {
            mockGetOccupancyData.mockResolvedValue({
                building2: { isOpen: false, count: 0, members: [] },
            });

            const fillResult: FillResult = {
                filled: 0,
                notified: 0,
                errors: [],
            };
            mockExitTimeFillService.fillAndNotify.mockResolvedValue(fillResult);

            const result = await service.runAll();

            expect(result.summary).toBe(
                '自動閉館: スキップ | 退室補完: 0件補完, 0件通知'
            );
        });

        it('should show error status when auto-close fails', async () => {
            mockGetOccupancyData.mockRejectedValue(new Error('Network error'));

            const fillResult: FillResult = {
                filled: 1,
                notified: 1,
                errors: [],
            };
            mockExitTimeFillService.fillAndNotify.mockResolvedValue(fillResult);

            const result = await service.runAll();

            expect(result.summary).toBe(
                '自動閉館: エラー | 退室補完: 1件補完, 1件通知'
            );
        });
    });
});
