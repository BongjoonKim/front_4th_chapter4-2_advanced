// ScheduleContext.tsx
import React, { createContext, PropsWithChildren, useContext, useReducer, useMemo, useCallback } from "react";
import { Schedule } from "./types.ts";
import dummyScheduleMap from "./dummyScheduleMap.ts";

// 액션 타입 정의
type ScheduleAction =
  | { type: 'UPDATE_TABLE', payload: { tableId: string, schedules: Schedule[] } }
  | { type: 'ADD_SCHEDULE', payload: { tableId: string, schedule: Schedule } }
  | { type: 'REMOVE_SCHEDULE', payload: { tableId: string, day: string, time: number } }
  | { type: 'DUPLICATE_TABLE', payload: { sourceId: string, targetId: string } }
  | { type: 'REMOVE_TABLE', payload: { tableId: string } }
  | { type: 'SET_SCHEDULES_MAP', payload: Record<string, Schedule[]> };

// 리듀서 함수
const scheduleReducer = (state: Record<string, Schedule[]>, action: ScheduleAction): Record<string, Schedule[]> => {
  switch (action.type) {
    case 'UPDATE_TABLE':
      return {
        ...state,
        [action.payload.tableId]: action.payload.schedules
      };
    
    case 'ADD_SCHEDULE':
      return {
        ...state,
        [action.payload.tableId]: [...state[action.payload.tableId], action.payload.schedule]
      };
    
    case 'REMOVE_SCHEDULE':
      return {
        ...state,
        [action.payload.tableId]: state[action.payload.tableId].filter(
          schedule => schedule.day !== action.payload.day || !schedule.range.includes(action.payload.time)
        )
      };
    
    case 'DUPLICATE_TABLE':
      return {
        ...state,
        [action.payload.targetId]: [...state[action.payload.sourceId]]
      };
    
    case 'REMOVE_TABLE':
      const newState = { ...state };
      delete newState[action.payload.tableId];
      return newState;
    
    case 'SET_SCHEDULES_MAP':
      return action.payload;
    
    default:
      return state;
  }
};

// 컨텍스트 타입 정의
interface ScheduleContextType {
  schedulesMap: Record<string, Schedule[]>;
  updateTable: (tableId: string, schedules: Schedule[]) => void;
  addSchedule: (tableId: string, schedule: Schedule) => void;
  removeSchedule: (tableId: string, day: string, time: number) => void;
  duplicateTable: (sourceId: string) => void;
  removeTable: (tableId: string) => void;
  setSchedulesMap: React.Dispatch<React.SetStateAction<Record<string, Schedule[]>>>;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export const useScheduleContext = () => {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
};

export const ScheduleProvider = ({ children }: PropsWithChildren) => {
  const [schedulesMap, dispatch] = useReducer(scheduleReducer, dummyScheduleMap);
  
  // 메모이제이션된 액션 디스패처들
  const updateTable = useCallback((tableId: string, schedules: Schedule[]) => {
    dispatch({ type: 'UPDATE_TABLE', payload: { tableId, schedules } });
  }, []);
  
  const addSchedule = useCallback((tableId: string, schedule: Schedule) => {
    dispatch({ type: 'ADD_SCHEDULE', payload: { tableId, schedule } });
  }, []);
  
  const removeSchedule = useCallback((tableId: string, day: string, time: number) => {
    dispatch({ type: 'REMOVE_SCHEDULE', payload: { tableId, day, time } });
  }, []);
  
  const duplicateTable = useCallback((sourceId: string) => {
    const targetId = `schedule-${Date.now()}`;
    dispatch({ type: 'DUPLICATE_TABLE', payload: { sourceId, targetId } });
  }, []);
  
  const removeTable = useCallback((tableId: string) => {
    dispatch({ type: 'REMOVE_TABLE', payload: { tableId } });
  }, []);
  
  // setSchedulesMap을 대체하는 함수 (기존 코드와의 호환성을 위해)
  const setSchedulesMap = useCallback((action: React.SetStateAction<Record<string, Schedule[]>>) => {
    if (typeof action === 'function') {
      const newState = action(schedulesMap);
      dispatch({ type: 'SET_SCHEDULES_MAP', payload: newState });
    } else {
      dispatch({ type: 'SET_SCHEDULES_MAP', payload: action });
    }
  }, [schedulesMap]);
  
  // 메모이제이션된 컨텍스트 값
  const contextValue = useMemo(() => ({
    schedulesMap,
    updateTable,
    addSchedule,
    removeSchedule,
    duplicateTable,
    removeTable,
    setSchedulesMap
  }), [
    schedulesMap,
    updateTable,
    addSchedule,
    removeSchedule,
    duplicateTable,
    removeTable,
    setSchedulesMap
  ]);
  
  return (
    <ScheduleContext.Provider value={contextValue}>
      {children}
    </ScheduleContext.Provider>
  );
};