/**
 * CachingService - Intelligent caching for Google Sheets data
 * Provides multi-level caching with TTL, compression, and smart invalidation
 */

/**
 * Caching Service for Google Apps Script optimization
 * Implements intelligent caching strategies for frequently accessed data
 */
class CachingService {
  constructor() {
    // Cache configuration
    this.config = {
      // Cache TTL (Time To Live) in milliseconds
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      longTTL: 30 * 60 * 1000, // 30 minutes for stable data
      shortTTL: 1 * 60 * 1000, // 1 minute for volatile data
      
      // Cache size limits
      maxCacheSize: 100 * 1024 * 1024, // 100MB (GAS memory limit consideration)
      maxEntries: 1000,
      
      // Compression settings
      enableCompression: true,
      compressionThreshold: 10 * 1024, // 10KB
      
      // Cache levels
      levels: {
        memory: true,
        properties: true, // Google Apps Script PropertiesService
        lock: true // Google Apps Script LockService for concurrency
      }
    };
    
    // In-memory cache
    this.memoryCache = new Map();
    
    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      compressionSaves: 0,
      totalSize: 0
    };
    
    // Cache key prefixes for different data types
    this.keyPrefixes = {
      contractData: 'cd_',
      sheetData: 'sd_',
      processedData: 'pd_',
      metadata: 'md_',
      validation: 'vd_'
    };
  }

  /**
   * Get data from cache with multi-level fallback
   * @param {string} key - Cache key
   * @param {Object} options - Cache options
   * @returns {any|null} Cached data or null if not found
   */
  get(key, options = {}) {
    const fullKey = this.buildKey(key, options.prefix);
    
    try {
      // Level 1: Memory cache (fastest)
      if (this.config.levels.memory) {
        const memoryResult = this.getFromMemory(fullKey);
        if (memoryResult !== null) {
          this.stats.hits++;
          console.log(`Cache HIT (memory): ${fullKey}`);
          return memoryResult;
        }
      }
      
      // Level 2: Properties Service (persistent)
      if (this.config.levels.properties) {
        const propertiesResult = this.getFromProperties(fullKey);
        if (propertiesResult !== null) {
          // Store back in memory for faster future access
          if (this.config.levels.memory) {
            this.setInMemory(fullKey, propertiesResult, options.ttl);
          }
          this.stats.hits++;
          console.log(`Cache HIT (properties): ${fullKey}`);
          return propertiesResult;
        }
      }
      
      // Cache miss
      this.stats.misses++;
      console.log(`Cache MISS: ${fullKey}`);
      return null;
      
    } catch (error) {
      console.error(`Cache GET error for key ${fullKey}:`, error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set data in cache with multi-level storage
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {Object} options - Cache options
   */
  set(key, data, options = {}) {
    const fullKey = this.buildKey(key, options.prefix);
    const ttl = options.ttl || this.config.defaultTTL;
    
    try {
      // Validate data size
      const dataSize = this.estimateSize(data);
      if (dataSize > this.config.maxCacheSize / 10) { // Don't cache items larger than 10% of max cache
        console.warn(`Cache SET skipped - data too large: ${fullKey} (${dataSize} bytes)`);
        return false;
      }
      
      // Level 1: Memory cache
      if (this.config.levels.memory) {
        this.setInMemory(fullKey, data, ttl);
      }
      
      // Level 2: Properties Service (for persistence)
      if (this.config.levels.properties) {
        this.setInProperties(fullKey, data, ttl);
      }
      
      this.stats.sets++;
      this.stats.totalSize += dataSize;
      
      console.log(`Cache SET: ${fullKey} (${dataSize} bytes, TTL: ${ttl}ms)`);
      return true;
      
    } catch (error) {
      console.error(`Cache SET error for key ${fullKey}:`, error);
      return false;
    }
  }

  /**
   * Get data from memory cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null
   */
  getFromMemory(key) {
    const entry = this.memoryCache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check TTL
    if (entry.expires && new Date().getTime() > entry.expires) {
      this.memoryCache.delete(key);
      this.stats.evictions++;
      return null;
    }
    
    return entry.data;
  }

  /**
   * Set data in memory cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  setInMemory(key, data, ttl) {
    // Check cache size limits
    if (this.memoryCache.size >= this.config.maxEntries) {
      this.evictOldestMemoryEntries(Math.floor(this.config.maxEntries * 0.1)); // Evict 10%
    }
    
    const entry = {
      data: data,
      created: new Date().getTime(),
      expires: ttl ? new Date().getTime() + ttl : null,
      size: this.estimateSize(data)
    };
    
    this.memoryCache.set(key, entry);
  }

  /**
   * Get data from Properties Service
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null
   */
  getFromProperties(key) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const cached = properties.getProperty(key);
      
      if (!cached) {
        return null;
      }
      
      const entry = JSON.parse(cached);
      
      // Check TTL
      if (entry.expires && new Date().getTime() > entry.expires) {
        properties.deleteProperty(key);
        this.stats.evictions++;
        return null;
      }
      
      // Decompress if needed
      let data = entry.data;
      if (entry.compressed) {
        data = this.decompress(data);
      }
      
      return data;
      
    } catch (error) {
      console.error(`Properties cache GET error for ${key}:`, error);
      return null;
    }
  }

  /**
   * Set data in Properties Service
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  setInProperties(key, data, ttl) {
    try {
      const properties = PropertiesService.getScriptProperties();
      
      let serializedData = data;
      let compressed = false;
      
      // Compress large data
      if (this.config.enableCompression) {
        const dataString = JSON.stringify(data);
        if (dataString.length > this.config.compressionThreshold) {
          serializedData = this.compress(dataString);
          compressed = true;
          this.stats.compressionSaves++;
        }
      }
      
      const entry = {
        data: serializedData,
        created: new Date().getTime(),
        expires: ttl ? new Date().getTime() + ttl : null,
        compressed: compressed
      };
      
      const entryString = JSON.stringify(entry);
      
      // Check if the entry is too large for Properties Service (9KB limit per property)
      if (entryString.length > 9000) {
        console.warn(`Properties cache SET skipped - entry too large: ${key} (${entryString.length} chars)`);
        return false;
      }
      
      properties.setProperty(key, entryString);
      return true;
      
    } catch (error) {
      console.error(`Properties cache SET error for ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete data from all cache levels
   * @param {string} key - Cache key
   * @param {Object} options - Delete options
   */
  delete(key, options = {}) {
    const fullKey = this.buildKey(key, options.prefix);
    
    try {
      // Delete from memory cache
      if (this.config.levels.memory) {
        this.memoryCache.delete(fullKey);
      }
      
      // Delete from Properties Service
      if (this.config.levels.properties) {
        const properties = PropertiesService.getScriptProperties();
        properties.deleteProperty(fullKey);
      }
      
      console.log(`Cache DELETE: ${fullKey}`);
      
    } catch (error) {
      console.error(`Cache DELETE error for ${fullKey}:`, error);
    }
  }

  /**
   * Clear cache by prefix or all cache
   * @param {string} prefix - Optional prefix to clear specific cache type
   */
  clear(prefix = null) {
    try {
      if (prefix) {
        // Clear specific prefix
        const fullPrefix = this.keyPrefixes[prefix] || prefix;
        
        // Clear memory cache
        if (this.config.levels.memory) {
          for (const key of this.memoryCache.keys()) {
            if (key.startsWith(fullPrefix)) {
              this.memoryCache.delete(key);
            }
          }
        }
        
        // Clear Properties Service (more complex - need to get all properties)
        if (this.config.levels.properties) {
          const properties = PropertiesService.getScriptProperties();
          const allProperties = properties.getProperties();
          
          for (const key in allProperties) {
            if (key.startsWith(fullPrefix)) {
              properties.deleteProperty(key);
            }
          }
        }
        
        console.log(`Cache CLEAR (prefix): ${fullPrefix}`);
        
      } else {
        // Clear all cache
        if (this.config.levels.memory) {
          this.memoryCache.clear();
        }
        
        if (this.config.levels.properties) {
          const properties = PropertiesService.getScriptProperties();
          properties.deleteAllProperties();
        }
        
        console.log('Cache CLEAR (all)');
      }
      
      // Reset stats
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        evictions: 0,
        compressionSaves: 0,
        totalSize: 0
      };
      
    } catch (error) {
      console.error('Cache CLEAR error:', error);
    }
  }

  /**
   * Get or set data with caching (cache-aside pattern)
   * @param {string} key - Cache key
   * @param {Function} dataLoader - Function to load data if not cached
   * @param {Object} options - Cache options
   * @returns {Promise} Promise that resolves with data
   */
  async getOrSet(key, dataLoader, options = {}) {
    // Try to get from cache first
    let data = this.get(key, options);
    
    if (data !== null) {
      return data;
    }
    
    // Data not in cache, load it
    try {
      console.log(`Cache loading data for: ${key}`);
      data = await dataLoader();
      
      // Cache the loaded data
      if (data !== null && data !== undefined) {
        this.set(key, data, options);
      }
      
      return data;
      
    } catch (error) {
      console.error(`Cache data loader error for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Intelligent cache warming for frequently accessed data
   * @param {Array} warmupTasks - Array of warmup task objects
   */
  async warmupCache(warmupTasks) {
    console.log(`Cache warming up ${warmupTasks.length} tasks`);
    
    for (const task of warmupTasks) {
      try {
        await this.getOrSet(task.key, task.loader, task.options);
        console.log(`Cache warmed: ${task.key}`);
      } catch (error) {
        console.error(`Cache warmup failed for ${task.key}:`, error);
      }
    }
  }

  /**
   * Build full cache key with prefix
   * @param {string} key - Base key
   * @param {string} prefix - Key prefix
   * @returns {string} Full cache key
   */
  buildKey(key, prefix) {
    if (prefix && this.keyPrefixes[prefix]) {
      return this.keyPrefixes[prefix] + key;
    }
    return prefix ? prefix + key : key;
  }

  /**
   * Estimate size of data in bytes
   * @param {any} data - Data to estimate
   * @returns {number} Estimated size in bytes
   */
  estimateSize(data) {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
    } catch (error) {
      return 1000; // Default estimate
    }
  }

  /**
   * Evict oldest entries from memory cache
   * @param {number} count - Number of entries to evict
   */
  evictOldestMemoryEntries(count) {
    const entries = Array.from(this.memoryCache.entries())
      .sort(([,a], [,b]) => a.created - b.created)
      .slice(0, count);
    
    for (const [key] of entries) {
      this.memoryCache.delete(key);
      this.stats.evictions++;
    }
    
    console.log(`Cache evicted ${count} oldest entries from memory`);
  }

  /**
   * Simple compression using basic string compression
   * @param {string} data - Data to compress
   * @returns {string} Compressed data
   */
  compress(data) {
    try {
      // Simple run-length encoding for repeated patterns
      return data.replace(/(.)\1{2,}/g, (match, char) => {
        return `${char}*${match.length}`;
      });
    } catch (error) {
      console.error('Compression error:', error);
      return data;
    }
  }

  /**
   * Decompress data
   * @param {string} compressedData - Compressed data
   * @returns {string} Decompressed data
   */
  decompress(compressedData) {
    try {
      // Reverse run-length encoding
      return compressedData.replace(/(.)\*(\d+)/g, (match, char, count) => {
        return char.repeat(parseInt(count));
      });
    } catch (error) {
      console.error('Decompression error:', error);
      return compressedData;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
      : 0;
    
    return {
      ...this.stats,
      hitRate: hitRate.toFixed(2) + '%',
      memoryEntries: this.memoryCache.size,
      averageSize: this.stats.sets > 0 ? Math.round(this.stats.totalSize / this.stats.sets) : 0
    };
  }

  /**
   * Create cache key for contract data
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} sheetName - Sheet name
   * @param {string} range - Optional range
   * @returns {string} Cache key
   */
  createContractDataKey(spreadsheetId, sheetName, range = 'all') {
    return `${spreadsheetId}_${sheetName}_${range}`;
  }

  /**
   * Create cache key for processed data
   * @param {string} dataHash - Hash of the source data
   * @param {string} processingVersion - Version of processing logic
   * @returns {string} Cache key
   */
  createProcessedDataKey(dataHash, processingVersion = '1.0') {
    return `${dataHash}_v${processingVersion}`;
  }

  /**
   * Invalidate related cache entries when data changes
   * @param {string} spreadsheetId - Spreadsheet ID that changed
   * @param {string} sheetName - Sheet name that changed
   */
  invalidateRelatedCache(spreadsheetId, sheetName) {
    const patterns = [
      `${this.keyPrefixes.contractData}${spreadsheetId}`,
      `${this.keyPrefixes.sheetData}${spreadsheetId}`,
      `${this.keyPrefixes.processedData}${spreadsheetId}`
    ];
    
    // Clear memory cache entries
    if (this.config.levels.memory) {
      for (const key of this.memoryCache.keys()) {
        if (patterns.some(pattern => key.startsWith(pattern))) {
          this.memoryCache.delete(key);
          console.log(`Cache invalidated (memory): ${key}`);
        }
      }
    }
    
    // Clear Properties Service entries
    if (this.config.levels.properties) {
      try {
        const properties = PropertiesService.getScriptProperties();
        const allProperties = properties.getProperties();
        
        for (const key in allProperties) {
          if (patterns.some(pattern => key.startsWith(pattern))) {
            properties.deleteProperty(key);
            console.log(`Cache invalidated (properties): ${key}`);
          }
        }
      } catch (error) {
        console.error('Error invalidating Properties Service cache:', error);
      }
    }
  }
}