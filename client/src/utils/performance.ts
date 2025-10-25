// client/src/utils/performance.ts
import React from "react";

/**
 * Performance monitoring utilities
 * 
 * This module provides utilities for monitoring and measuring
 * performance metrics in the Declare Card Game application.
 */

/**
 * Performance metrics interface
 */
interface PerformanceMetrics {
  componentRenderTime: number;
  userInteractionTime: number;
  memoryUsage?: number;
  timestamp: number;
}

/**
 * Performance monitoring class
 */
class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.NODE_ENV === "development";
  }

  /**
   * Measures component render time
   * 
   * @param componentName - Name of the component being measured
   * @param renderFunction - Function that renders the component
   * @returns The rendered component
   */
  measureRenderTime<T>(
    componentName: string,
    renderFunction: () => T
  ): T {
    if (!this.isEnabled) {
      return renderFunction();
    }

    const startTime = performance.now();
    const result = renderFunction();
    const endTime = performance.now();

    const renderTime = endTime - startTime;
    
    this.recordMetric({
      componentRenderTime: renderTime,
      userInteractionTime: 0,
      timestamp: Date.now(),
    });

    // Log slow renders
    if (renderTime > 16) { // More than one frame at 60fps
      console.warn(
        `Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`
      );
    }

    return result;
  }

  /**
   * Measures user interaction time
   * 
   * @param interactionName - Name of the interaction being measured
   * @param interactionFunction - Function that handles the interaction
   * @returns Promise that resolves with the interaction result
   */
  async measureInteractionTime<T>(
    interactionName: string,
    interactionFunction: () => Promise<T>
  ): Promise<T> {
    if (!this.isEnabled) {
      return interactionFunction();
    }

    const startTime = performance.now();
    const result = await interactionFunction();
    const endTime = performance.now();

    const interactionTime = endTime - startTime;
    
    this.recordMetric({
      componentRenderTime: 0,
      userInteractionTime: interactionTime,
      timestamp: Date.now(),
    });

    // Log slow interactions
    if (interactionTime > 100) { // More than 100ms
      console.warn(
        `Slow interaction detected in ${interactionName}: ${interactionTime.toFixed(2)}ms`
      );
    }

    return result;
  }

  /**
   * Records a performance metric
   * 
   * @param metric - The performance metric to record
   */
  private recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only the last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  /**
   * Gets performance metrics summary
   * 
   * @returns Summary of performance metrics
   */
  getMetricsSummary(): {
    averageRenderTime: number;
    averageInteractionTime: number;
    slowRenders: number;
    slowInteractions: number;
    totalMetrics: number;
  } {
    if (this.metrics.length === 0) {
      return {
        averageRenderTime: 0,
        averageInteractionTime: 0,
        slowRenders: 0,
        slowInteractions: 0,
        totalMetrics: 0,
      };
    }

    const renderTimes = this.metrics
      .map(m => m.componentRenderTime)
      .filter(time => time > 0);
    
    const interactionTimes = this.metrics
      .map(m => m.userInteractionTime)
      .filter(time => time > 0);

    const averageRenderTime = renderTimes.length > 0
      ? renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length
      : 0;

    const averageInteractionTime = interactionTimes.length > 0
      ? interactionTimes.reduce((sum, time) => sum + time, 0) / interactionTimes.length
      : 0;

    const slowRenders = renderTimes.filter(time => time > 16).length;
    const slowInteractions = interactionTimes.filter(time => time > 100).length;

    return {
      averageRenderTime,
      averageInteractionTime,
      slowRenders,
      slowInteractions,
      totalMetrics: this.metrics.length,
    };
  }

  /**
   * Clears all performance metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Enables or disables performance monitoring
   * 
   * @param enabled - Whether to enable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Higher-order component for measuring render performance
 * 
 * @param componentName - Name of the component
 * @param Component - The component to wrap
 * @returns Wrapped component with performance monitoring
 */
export function withPerformanceMonitoring<P extends object>(
  componentName: string,
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return React.memo((props: P) => {
    return performanceMonitor.measureRenderTime(
      componentName,
      () => React.createElement(Component, props)
    );
  });
}

/**
 * Hook for measuring user interactions
 * 
 * @param interactionName - Name of the interaction
 * @returns Function to wrap async interactions
 */
export function usePerformanceMonitoring(interactionName: string) {
  return React.useCallback(
    async <T>(interaction: () => Promise<T>): Promise<T> => {
      return performanceMonitor.measureInteractionTime(
        interactionName,
        interaction
      );
    },
    [interactionName]
  );
}

export default performanceMonitor;
