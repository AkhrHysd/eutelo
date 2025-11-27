/**
 * GraphCache - スケルトン実装
 * 
 * 将来の CI 間キャッシュ共有のための入り口を用意する。
 * 
 * ## 意図
 * - グラフ構築は大量のドキュメントをスキャンするためコストが高い
 * - CI 環境ではビルド間でキャッシュを共有することで高速化が可能
 * - 現在は未実装だが、将来の拡張ポイントとして定義
 * 
 * ## 将来の実装予定
 * - グラフ構造のシリアライズ/デシリアライズ
 * - ファイルハッシュベースの差分検出
 * - キャッシュの有効期限管理
 */

import type { DocumentGraph, GraphAdjacency } from './types.js';

/**
 * キャッシュに保存するグラフデータの型
 */
export type CachedGraphData = {
  /** グラフ構造 */
  graph: DocumentGraph;
  /** 隣接リスト */
  adjacency: GraphAdjacency;
  /** キャッシュ作成時刻 */
  timestamp: number;
  /** キャッシュバージョン */
  version: string;
};

/**
 * キャッシュオプション
 */
export type GraphCacheOptions = {
  /** キャッシュファイルのパス */
  cachePath?: string;
  /** キャッシュの有効期限（ミリ秒） */
  ttl?: number;
};

/**
 * GraphCache - グラフデータのキャッシュ管理（未実装スケルトン）
 * 
 * 現在は何も行わないスケルトン実装。
 * 将来の CI 間キャッシュ共有のための入り口として定義。
 */
export class GraphCache {
  private readonly options: GraphCacheOptions;

  constructor(options: GraphCacheOptions = {}) {
    this.options = options;
  }

  /**
   * キャッシュからグラフデータを取得する
   * 
   * @returns キャッシュデータ、またはキャッシュが無効/未存在の場合は null
   * @remarks 現在は常に null を返す（未実装）
   */
  async get(): Promise<CachedGraphData | null> {
    // 将来実装: ファイルからキャッシュを読み込み、有効期限を検証
    return null;
  }

  /**
   * グラフデータをキャッシュに保存する
   * 
   * @param data 保存するグラフデータ
   * @remarks 現在は何も行わない（未実装）
   */
  async set(_data: Omit<CachedGraphData, 'timestamp' | 'version'>): Promise<void> {
    // 将来実装: グラフデータをファイルにシリアライズ
  }

  /**
   * キャッシュを無効化する
   * 
   * @remarks 現在は何も行わない（未実装）
   */
  async invalidate(): Promise<void> {
    // 将来実装: キャッシュファイルを削除
  }

  /**
   * キャッシュが有効かどうかを判定する
   * 
   * @returns 常に false（未実装）
   */
  async isValid(): Promise<boolean> {
    // 将来実装: ファイルハッシュの比較による差分検出
    return false;
  }
}

