// ScheduleDndProvider.tsx
import { DndContext, Modifier, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { PropsWithChildren, useCallback } from "react";
import { CellSize, DAY_LABELS } from "./constants.ts";
import { useScheduleContext } from "./ScheduleContext.tsx";

function createSnapModifier(): Modifier {
  return ({ transform, containerNodeRect, draggingNodeRect }) => {
    const containerTop = containerNodeRect?.top ?? 0;
    const containerLeft = containerNodeRect?.left ?? 0;
    const containerBottom = containerNodeRect?.bottom ?? 0;
    const containerRight = containerNodeRect?.right ?? 0;
    
    const { top = 0, left = 0, bottom = 0, right = 0 } = draggingNodeRect ?? {};
    
    const minX = containerLeft - left + 120 + 1;
    const minY = containerTop - top + 40 + 1;
    const maxX = containerRight - right;
    const maxY = containerBottom - bottom;
    
    return ({
      ...transform,
      x: Math.min(Math.max(Math.round(transform.x / CellSize.WIDTH) * CellSize.WIDTH, minX), maxX),
      y: Math.min(Math.max(Math.round(transform.y / CellSize.HEIGHT) * CellSize.HEIGHT, minY), maxY),
    })
  };
}

const modifiers = [createSnapModifier()];

// DnD Context를 사용하기 위한 커스텀 훅
export const useDndContextValue = () => {
  const { setSchedulesMap } = useScheduleContext();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragEnd = useCallback((event: any) => {
    const { active, delta } = event;
    const { x, y } = delta;
    const [tableId, index] = active.id.split(':');
    
    setSchedulesMap(prevSchedulesMap => {
      // 현재 드래그 중인 스케줄만 찾아서 업데이트
      const schedule = prevSchedulesMap[tableId][index];
      const nowDayIndex = DAY_LABELS.indexOf(schedule.day as typeof DAY_LABELS[number]);
      const moveDayIndex = Math.floor(x / 80);
      const moveTimeIndex = Math.floor(y / 30);
      
      // 해당 테이블의 스케줄만 업데이트하고 나머지는 그대로 유지
      const updatedSchedules = [...prevSchedulesMap[tableId]];
      updatedSchedules[index] = {
        ...schedule,
        day: DAY_LABELS[nowDayIndex + moveDayIndex],
        range: schedule.range.map(time => time + moveTimeIndex),
      };
      
      return {
        ...prevSchedulesMap,
        [tableId]: updatedSchedules
      };
    });
  }, [setSchedulesMap]);
  
  return { sensors, handleDragEnd, modifiers };
};

export default function ScheduleDndProvider({ children }: PropsWithChildren) {
  const { sensors, handleDragEnd, modifiers } = useDndContextValue();
  
  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd} modifiers={modifiers}>
      {children}
    </DndContext>
  );
}