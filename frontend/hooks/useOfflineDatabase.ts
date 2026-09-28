/**
 * SILAGEGUARD AI — useOfflineDatabase Custom Hook
 * Provides query methods and reactive updates for local SQLite batches.
 */

import { useState, useEffect, useCallback } from "react";
import { batchRepository } from "../sqlite/batchRepository";
import { BatchRecord } from "../sqlite/database";

export function useOfflineDatabase() {
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshBatches = useCallback(async () => {
    setLoading(true);
    const list = await batchRepository.getAllBatches();
    setBatches(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshBatches();
  }, [refreshBatches]);

  return {
    batches,
    loading,
    refreshBatches,
    getBatchById: batchRepository.getBatchById,
    filterBatches: batchRepository.filterBatches,
    getStats: batchRepository.getSummaryStats
  };
}
