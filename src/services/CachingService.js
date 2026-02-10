/**
 * CachingService - Stub for GAS server-side compatibility
 * Uses GAS CacheService in Code.js directly instead
 */
class CachingService {
  constructor() {
    this.memoryCache = new Map();
    this.stats = { hits: 0, misses: 0, sets: 0, evictions: 0, totalSize: 0 };
  }
  get(key) { return this.memoryCache.has(key) ? this.memoryCache.get(key) : null; }
  set(key, data) { this.memoryCache.set(key, data); this.stats.sets++; }
  delete(key) { this.memoryCache.delete(key); }
  clear() { this.memoryCache.clear(); }
  getStats() { return { ...this.stats, hitRate: '0%', memoryEntries: this.memoryCache.size }; }
  createContractDataKey(id, sheet) { return id + '_' + sheet; }
  getOrSet(key, loader, options) { var d = this.get(key); if (d) return d; return loader(); }
}
