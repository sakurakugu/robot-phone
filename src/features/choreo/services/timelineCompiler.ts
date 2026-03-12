/**
 * 时间轴编译器
 * 将 TimelineData 编译为 ExecutionPlan（移植自后端 编舞服务.compileTimeline）
 */

import type {
    ExecutionPlan,
    ScheduledAction,
    TimelineData,
} from '../types';

let scheduleCounter = 0;

function generateScheduleId(): string {
  scheduleCounter += 1;
  return `mobile_${Date.now()}_${scheduleCounter}`;
}

/**
 * 编译时间轴为执行计划
 * 遍历所有 action 类型轨道的 blocks，按 executeAt 排序
 */
export function compileTimeline(
  projectUuid: string,
  timelineData: TimelineData,
): ExecutionPlan {
  const { tracks, config } = timelineData;
  const scheduleId = generateScheduleId();
  const actions: ScheduledAction[] = [];
  const robotIdSet = new Set<string>();

  for (const track of tracks) {
    if (track.type !== 'action') continue;
    const blocks = track.blocks ?? [];

    for (const block of blocks) {
      // 块级 robotId 优先，其次取轨道级 robotId
      const robotId = block.robotId || track.robotId;
      if (!robotId) continue;

      const actionName = block.actionType;
      if (!actionName) continue;

      robotIdSet.add(robotId);

      actions.push({
        robotId,
        action: actionName,
        parameters: block.actionParams,
        executeAt: Math.round(block.startTime * 1000),
        duration: Math.round(block.duration * 1000),
      });
    }
  }

  // 按执行时间排序
  actions.sort((a, b) => a.executeAt - b.executeAt);

  const totalDuration = Math.round(config.duration * 1000);

  return {
    scheduleId,
    projectUuid,
    totalDuration,
    actions,
    robotIds: Array.from(robotIdSet),
  };
}
