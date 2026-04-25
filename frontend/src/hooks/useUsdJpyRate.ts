import { useState, useEffect } from "react";

// レート情報の型
type UseUsdJpyRateReturn = {
  rate: number | null;
  loading: boolean;
  error: string | null;
};

/**
 * 米ドル日本円レート取得のカスタムフック
 * @returns 米ドル日本円レート取得のカスタムフック
 */
export function useUsdJpyRate(): UseUsdJpyRateReturn {
  // レート
  const [rate, setRate] = useState<number | null>(null);
  // ロード中フラグ
  const [loading, setLoading] = useState(true);
  // エラー情報
  const [error, setError] = useState<string | null>(null);

  // frankfurterのAPIは1日1回更新のため、マウント時に1回だけAPIを実行して、レートを取得する
  useEffect(() => {
    const fetchRate = async () => {
      try {
        setLoading(true);
        const res = await fetch("/frankfurter/latest?from=USD&to=JPY");
        if (!res.ok) throw new Error("レート取得失敗");
        const data = await res.json();
        setRate(data.rates.JPY);
      } catch (e) {
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    fetchRate();
  }, []);

  return { rate, loading, error };
}
