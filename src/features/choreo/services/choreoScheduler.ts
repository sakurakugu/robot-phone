/**
 * 编舞调度器
 * 根据 ExecutionPlan 按时间精确派发动作指令到 D1 机器狗
 * 通过 ws://ip:8082 直连发送 control_command
 */

import type { ExecutionPlan, ScheduledAction } from '../types';

export type SchedulerState = 'idle' | 'running' | 'paused' | 'stopped' | 'completed';

export type SchedulerCallbacks = {
  /** 进度更新（约每 500ms 触发） */
  onProgress?: (currentTime: number, totalDuration: number) => void;
  /** 单个动作被执行 */
  onAction?: (action: ScheduledAction) => void;
  /** 执行完成 */
  onComplete?: () => void;
  /** 执行出错 */
  onError?: (error: string) => void;
  /** 状态变更 */
  onStateChange?: (state: SchedulerState) => void;
};

// WebSocket 连接映射：robotId → WebSocket
type WsMap = Map<string, WebSocket>;

export class ChoreoScheduler {
  private state: SchedulerState = 'idle';
  private plan: ExecutionPlan | null = null;
  private wsMap: WsMap = new Map();

  // 时间追踪
  private startRealTime = 0;
  private pausedAt = 0;
  private totalPausedDuration = 0;

  // 定时器
  private actionTimers: ReturnType<typeof setTimeout>[] = [];
  private progressInterval: ReturnType<typeof setInterval> | null = null;
  private completionTimer: ReturnType<typeof setTimeout> | null = null;

  private callbacks: SchedulerCallbacks = {};

  getState(): SchedulerState {
    return this.state;
  }

  getCurrentTime(): number {
    if (this.state === 'paused') return this.pausedAt;
    if (this.state !== 'running' || !this.plan) return 0;
    return Date.now() - this.startRealTime - this.totalPausedDuration;
  }

  getProgress(): number {
    if (!this.plan || this.plan.totalDuration === 0) return 0;
    return Math.min(100, (this.getCurrentTime() / this.plan.totalDuration) * 100);
  }

  /**
   * 设置 robotId → WebSocket 映射
   * 在播放前，由外部将工程内的 robotId 映射到真实 D1 机器狗的 ws 连接
   */
  setConnections(wsMap: WsMap): void {
    this.wsMap = wsMap;
  }

  /**
   * 启动执行
   */
  start(plan: ExecutionPlan, callbacks: SchedulerCallbacks): void {
    if (this.state === 'running') {
      this.stop();
    }

    this.plan = plan;
    this.callbacks = callbacks;
    this.startRealTime = Date.now();
    this.totalPausedDuration = 0;
    this.pausedAt = 0;

    this.setState('running');

    // 安排所有动作
    this.scheduleActions(plan.actions, 0);

    // 进度广播（每 500ms）
    this.progressInterval = setInterval(() => {
      if (this.state !== 'running' || !this.plan) return;
      this.callbacks.onProgress?.(this.getCurrentTime(), this.plan.totalDuration);
    }, 500);

    // 安排完成事件
    this.completionTimer = setTimeout(() => {
      this.complete();
    }, plan.totalDuration);
  }

  /**
   * 暂停
   */
  pause(): boolean {
    if (this.state !== 'running') return false;
    this.pausedAt = this.getCurrentTime();
    this.clearTimers();
    this.setState('paused');
    return true;
  }

  /**
   * 恢复
   */
  resume(): boolean {
    if (this.state !== 'paused' || !this.plan) return false;

    const now = Date.now();
    this.startRealTime = now - this.pausedAt;
    this.totalPausedDuration = 0;
    this.setState('running');

    // 重新安排尚未执行的动作
    const remaining = this.plan.actions.filter(a => a.executeAt > this.pausedAt);
    this.scheduleActions(remaining, this.pausedAt);

    // 重启进度广播
    this.progressInterval = setInterval(() => {
      if (this.state !== 'running' || !this.plan) return;
      this.callbacks.onProgress?.(this.getCurrentTime(), this.plan.totalDuration);
    }, 500);

    // 重新安排完成定时器
    const remainingTime = this.plan.totalDuration - this.pausedAt;
    this.completionTimer = setTimeout(() => {
      this.complete();
    }, remainingTime);

    return true;
  }

  /**
   * 停止
   */
  stop(): void {
    if (this.state === 'idle' || this.state === 'stopped' || this.state === 'completed') return;
    this.clearTimers();
    this.setState('stopped');
    this.cleanup();
  }

  /**
   * 销毁调度器
   */
  destroy(): void {
    this.clearTimers();
    this.cleanup();
  }

  // ── 内部方法 ──

  private setState(state: SchedulerState): void {
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }

  private scheduleActions(actions: ScheduledAction[], baseTime: number): void {
    for (const action of actions) {
      const delay = action.executeAt - baseTime;
      if (delay < 0) continue;

      const timer = setTimeout(() => {
        if (this.state !== 'running') return;
        this.executeAction(action);
      }, delay);

      this.actionTimers.push(timer);
    }
  }

  private executeAction(action: ScheduledAction): void {
    const { robotId, action: actionName, parameters } = action;

    // 通过映射的 WebSocket 发送指令
    const ws = this.wsMap.get(robotId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'control_command',
        data: {
          command: 'action',
          action: actionName,
          parameters: parameters || {},
        },
      }));
    }

    this.callbacks.onAction?.(action);
  }

  private complete(): void {
    if (this.state !== 'running') return;
    this.clearTimers();
    this.setState('completed');
    this.callbacks.onComplete?.();
    this.cleanup();
  }

  private clearTimers(): void {
    for (const timer of this.actionTimers) {
      clearTimeout(timer);
    }
    this.actionTimers = [];

    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }

    if (this.completionTimer) {
      clearTimeout(this.completionTimer);
      this.completionTimer = null;
    }
  }

  private cleanup(): void {
    this.plan = null;
    this.callbacks = {};
  }
}
