/**
 * Memory monitoring utilities for stability
 */

import { freemem, totalmem } from "node:os";

export interface MemoryStatus {
  readonly freeMemoryMB: number;
  readonly totalMemoryMB: number;
  readonly usedMemoryMB: number;
  readonly freePercentage: number;
  readonly isLow: boolean;
  readonly isCritical: boolean;
}

/**
 * Get current memory status
 */
export function getMemoryStatus(): MemoryStatus {
  const freeBytes = freemem();
  const totalBytes = totalmem();
  const usedBytes = totalBytes - freeBytes;
  
  const freeMemoryMB = Math.round(freeBytes / 1024 / 1024);
  const totalMemoryMB = Math.round(totalBytes / 1024 / 1024);
  const usedMemoryMB = Math.round(usedBytes / 1024 / 1024);
  const freePercentage = Math.round((freeBytes / totalBytes) * 100);
  
  // Low memory: < 20% free or < 1GB free
  const isLow = freePercentage < 20 || freeMemoryMB < 1024;
  
  // Critical memory: < 10% free or < 512MB free
  const isCritical = freePercentage < 10 || freeMemoryMB < 512;
  
  return {
    freeMemoryMB,
    totalMemoryMB,
    usedMemoryMB,
    freePercentage,
    isLow,
    isCritical,
  };
}

/**
 * Check if there's enough memory for the operation
 */
export function checkMemoryAvailability(requiredMB: number = 1024): {
  readonly available: boolean;
  readonly message?: string;
} {
  const status = getMemoryStatus();
  
  if (status.isCritical) {
    return {
      available: false,
      message: `Critical memory shortage: only ${status.freeMemoryMB}MB free (${status.freePercentage}%). Close other applications.`,
    };
  }
  
  if (status.freeMemoryMB < requiredMB) {
    return {
      available: false,
      message: `Insufficient memory: ${status.freeMemoryMB}MB free, ${requiredMB}MB required. Close other applications.`,
    };
  }
  
  if (status.isLow) {
    return {
      available: true,
      message: `Low memory warning: ${status.freeMemoryMB}MB free (${status.freePercentage}%). Consider closing other applications.`,
    };
  }
  
  return { available: true };
}

/**
 * Log memory status
 */
export function logMemoryStatus(prefix: string = "Memory"): void {
  const status = getMemoryStatus();
  console.log(`${prefix}: ${status.freeMemoryMB}MB free / ${status.totalMemoryMB}MB total (${status.freePercentage}% free)`);
  
  if (status.isCritical) {
    console.warn("⚠️  Critical memory shortage detected!");
  } else if (status.isLow) {
    console.warn("⚠️  Low memory detected");
  }
}
