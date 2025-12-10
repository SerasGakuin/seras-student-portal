# テスト戦略 (Testing Strategy)

Google Sheets などの「壊れやすい」外部データソースに依存しているため、特にビジネスロジックの堅牢性を確保するためにテストを重視しています。

## テストフレームワーク
- **Test Runner**: Jest
- **Environment**: Node.js (Service Layer用)

## テストの実行
```bash
# 全テストの実行
npm test

# ウォッチモード（開発中におすすめ）
npm test -- --watch
```

## 何をテストするか
1.  **Services (`src/services/*.ts`)**: **必須**。
    - `studentService`: 生徒データのパース、動的カラム対応、バリデーション。
    - `calendarService`: タイムゾーン考慮 (JST)、イベント作成パラメータ。
    - `lineService`: (現在はモック前提だが) 送信ロジック。
    
2.  **Utilities (`src/lib/*.ts`)**: 複雑な処理があれば推奨。

3.  **UI Components**: ロジックが複雑な場合（例: `TimeRangeSlider`）はStorybook等での検証を推奨（現在は手動確認がメイン）。

## 新しいテストの書き方
ソースコードと同じディレクトリに `*.test.ts` ファイルを作成します。

パターン例:
```typescript
import { yourFunction } from './yourFile';
import { dependency } from '@/lib/dependency';

// 1. 外部依存のモック化
jest.mock('@/lib/dependency', () => ({
    dependency: jest.fn(),
}));

describe('yourFunction', () => {
    // 2. テストごとのモックリセット
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should behave correctly on success', async () => {
        // 3. モックの戻り値設定
        (dependency as jest.Mock).mockResolvedValue({ status: 'ok' });

        // 4. 関数実行
        const result = await yourFunction();

        // 5. アサーション (検証)
        expect(result).toBe(true);
        expect(dependency).toHaveBeenCalled();
    });
});
```
