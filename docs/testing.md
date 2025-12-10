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
    - 生徒データのパース処理が正しいか。
    - Zod バリデーションが意図通り機能するか。
    - 外部API呼び出し時のパラメータが正しいか（モックを使用）。
    
2.  **Utilities (`src/lib/*.ts`)**: 複雑な処理があれば推奨。

3.  **UI Components**: 現フェーズでは任意（ロジックのテストを優先）。

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
