// SearchDialog.tsx
import {memo, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Table,
  Tag,
  TagCloseButton,
  TagLabel,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  Wrap,
} from "@chakra-ui/react";
import { useScheduleContext } from "./ScheduleContext.tsx";
import { Lecture } from "./types.ts";
import { parseSchedule } from "./utils.ts";
import axios, {AxiosResponse} from "axios";
import { DAY_LABELS } from "./constants.ts";

interface Props {
  searchInfo: {
    tableId: string;
    day?: string;
    time?: number;
  } | null;
  onClose: () => void;
}

interface SearchOption {
  query?: string,
  grades: number[],
  days: string[],
  times: number[],
  majors: string[],
  credits?: number,
}

const TIME_SLOTS = [
  { id: 1, label: "09:00~09:30" },
  { id: 2, label: "09:30~10:00" },
  { id: 3, label: "10:00~10:30" },
  { id: 4, label: "10:30~11:00" },
  { id: 5, label: "11:00~11:30" },
  { id: 6, label: "11:30~12:00" },
  { id: 7, label: "12:00~12:30" },
  { id: 8, label: "12:30~13:00" },
  { id: 9, label: "13:00~13:30" },
  { id: 10, label: "13:30~14:00" },
  { id: 11, label: "14:00~14:30" },
  { id: 12, label: "14:30~15:00" },
  { id: 13, label: "15:00~15:30" },
  { id: 14, label: "15:30~16:00" },
  { id: 15, label: "16:00~16:30" },
  { id: 16, label: "16:30~17:00" },
  { id: 17, label: "17:00~17:30" },
  { id: 18, label: "17:30~18:00" },
  { id: 19, label: "18:00~18:50" },
  { id: 20, label: "18:55~19:45" },
  { id: 21, label: "19:50~20:40" },
  { id: 22, label: "20:45~21:35" },
  { id: 23, label: "21:40~22:30" },
  { id: 24, label: "22:35~23:25" },
];

// 캐시 기능이 있는 API 호출 함수를 만듭니다
// Axios의 응답 타입을 명시적으로 정의
interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  config: any;
}

type FetchFunction = () => Promise<ApiResponse<Lecture[]>>;

const createCachedFetcher = (fetchFn: FetchFunction) => {
  let cache: ApiResponse<Lecture[]> | null = null;
  let fetchPromise: Promise<ApiResponse<Lecture[]>> | null = null;
  
  return (): Promise<ApiResponse<Lecture[]>> => {
    // 이미 캐시된 결과가 있으면 그것을 반환
    if (cache) {
      console.log('캐시된 데이터 사용', performance.now());
      return Promise.resolve(cache);
    }
    
    // 요청 중인 Promise가 있으면 그것을 반환
    if (fetchPromise) {
      console.log('진행 중인 요청 사용', performance.now());
      return fetchPromise;
    }
    
    // 새 요청 시작
    console.log('새 API 요청', performance.now());
    fetchPromise = fetchFn().then((result: ApiResponse<Lecture[]>) => {
      cache = result; // 결과 캐싱
      fetchPromise = null;
      return result;
    });
    
    return fetchPromise;
  };
};

const PAGE_SIZE = 100;

const fetchMajors = () => axios.get<Lecture[]>('/schedules-majors.json');
const fetchLiberalArts = () => axios.get<Lecture[]>('/schedules-liberal-arts.json');

// 캐시 적용된 API 호출 함수 생성
const cachedFetchMajors = createCachedFetcher(fetchMajors);
const cachedFetchLiberalArts = createCachedFetcher(fetchLiberalArts);


// TODO: 이 코드를 개선해서 API 호출을 최소화 해보세요 + Promise.all이 현재 잘못 사용되고 있습니다. 같이 개선해주세요.
const fetchAllLectures = async () => {
  console.log('병렬 API 호출 시작', performance.now());
  const promises = [
    cachedFetchMajors().then((result : ApiResponse<Lecture[]>) => (console.log('API Call 1', performance.now()), result)),
    cachedFetchLiberalArts().then((result :ApiResponse<Lecture[]>) => (console.log('API Call 2', performance.now()), result)),
    cachedFetchMajors().then((result :ApiResponse<Lecture[]>) => (console.log('API Call 3', performance.now()), result)),
    cachedFetchLiberalArts().then((result :ApiResponse<Lecture[]>) => (console.log('API Call 4', performance.now()), result)),
    cachedFetchMajors().then((result :ApiResponse<Lecture[]>) => (console.log('API Call 5', performance.now()), result)),
    cachedFetchLiberalArts().then((result :ApiResponse<Lecture[]>) => (console.log('API Call 6', performance.now()), result)),
  ];
  
  return Promise.all(promises);
};

// 메모이제이션된 TimeSlot 컴포넌트
interface TimeSlotProps {
  id: number;
  label: string;
  isSelected: boolean;
  onToggle: (id: number) => void;
}

const TimeSlotItem = memo(({ id, label, isSelected, onToggle }: TimeSlotProps) => {
  console.log(`TimeSlotItem ${id} 렌더링`, performance.now());
  return (
    <Box key={id}>
      <Checkbox
        key={id}
        size="sm"
        value={id}
        isChecked={isSelected}
        onChange={() => onToggle(id)}
      >
        {id}교시({label})
      </Checkbox>
    </Box>
  );
});

// 메모이제이션된 Major 컴포넌트
interface MajorItemProps {
  major: string;
  isSelected: boolean;
  onToggle: (major: string) => void;
}

const MajorItem = memo(({ major, isSelected, onToggle }: MajorItemProps) => {
  console.log(`MajorItem ${major.substring(0, 10)} 렌더링`, performance.now());
  return (
    <Box key={major}>
      <Checkbox
        key={major}
        size="sm"
        value={major}
        isChecked={isSelected}
        onChange={() => onToggle(major)}
      >
        {major.replace(/<p>/gi, ' ')}
      </Checkbox>
    </Box>
  );
});

// 메모이제이션된 강의 행 컴포넌트
interface LectureRowProps {
  lecture: Lecture;
  index: number;
  onAddSchedule: (lecture: Lecture) => void;
}

const LectureRow = memo(({ lecture, index, onAddSchedule }: LectureRowProps) => {
  console.log(`LectureRow ${lecture.id}-${index} 렌더링`, performance.now());
  return (
    <Tr key={`${lecture.id}-${index}`}>
      <Td width="100px">{lecture.id}</Td>
      <Td width="50px">{lecture.grade}</Td>
      <Td width="200px">{lecture.title}</Td>
      <Td width="50px">{lecture.credits}</Td>
      <Td width="150px" dangerouslySetInnerHTML={{ __html: lecture.major }}/>
      <Td width="150px" dangerouslySetInnerHTML={{ __html: lecture.schedule }}/>
      <Td width="80px">
        <Button
          size="sm"
          colorScheme="green"
          onClick={() => onAddSchedule(lecture)}
        >
          추가
        </Button>
      </Td>
    </Tr>
  );
});

// TODO: 이 컴포넌트에서 불필요한 연산이 발생하지 않도록 다양한 방식으로 시도해주세요.
const SearchDialog = ({ searchInfo, onClose }: Props) => {
  const { setSchedulesMap } = useScheduleContext();
  
  const loaderWrapperRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [page, setPage] = useState(1);
  const [searchOptions, setSearchOptions] = useState<SearchOption>({
    query: '',
    grades: [],
    days: [],
    times: [],
    majors: [],
  });

  // const getFilteredLectures = () => {
  //   const { query = '', credits, grades, days, times, majors } = searchOptions;
  //   return lectures
  //     .filter(lecture =>
  //       lecture.title.toLowerCase().includes(query.toLowerCase()) ||
  //       lecture.id.toLowerCase().includes(query.toLowerCase())
  //     )
  //     .filter(lecture => grades.length === 0 || grades.includes(lecture.grade))
  //     .filter(lecture => majors.length === 0 || majors.includes(lecture.major))
  //     .filter(lecture => !credits || lecture.credits.startsWith(String(credits)))
  //     .filter(lecture => {
  //       if (days.length === 0) {
  //         return true;
  //       }
  //       const schedules = lecture.schedule ? parseSchedule(lecture.schedule) : [];
  //       return schedules.some(s => days.includes(s.day));
  //     })
  //     .filter(lecture => {
  //       if (times.length === 0) {
  //         return true;
  //       }
  //       const schedules = lecture.schedule ? parseSchedule(lecture.schedule) : [];
  //       return schedules.some(s => s.range.some(time => times.includes(time)));
  //     });
  // }

  // const filteredLectures = getFilteredLectures();
  
  // useMemo를 사용하여 검색 옵션이나 강의 데이터가 변경될 때만 필터링 연산 수행
  const filteredLectures = useMemo(() => {
    console.log('필터링 연산 실행', performance.now());
    const { query = '', credits, grades, days, times, majors } = searchOptions;
    return lectures
      .filter(lecture =>
        lecture.title.toLowerCase().includes(query.toLowerCase()) ||
        lecture.id.toLowerCase().includes(query.toLowerCase())
      )
      .filter(lecture => grades.length === 0 || grades.includes(lecture.grade))
      .filter(lecture => majors.length === 0 || majors.includes(lecture.major))
      .filter(lecture => !credits || lecture.credits.startsWith(String(credits)))
      .filter(lecture => {
        if (days.length === 0) {
          return true;
        }
        const schedules = lecture.schedule ? parseSchedule(lecture.schedule) : [];
        return schedules.some(s => days.includes(s.day));
      })
      .filter(lecture => {
        if (times.length === 0) {
          return true;
        }
        const schedules = lecture.schedule ? parseSchedule(lecture.schedule) : [];
        return schedules.some(s => s.range.some(time => times.includes(time)));
      });
  }, [lectures, searchOptions]);
  
  // const lastPage = Math.ceil(filteredLectures.length / PAGE_SIZE);
  // const visibleLectures = filteredLectures.slice(0, page * PAGE_SIZE);
  // const allMajors = [...new Set(lectures.map(lecture => lecture.major))];
  
  // 페이지 관련 계산도 메모이제이션
  const lastPage = useMemo(() =>
      Math.ceil(filteredLectures.length / PAGE_SIZE),
    [filteredLectures.length]
  );
  
  // 현재 페이지에 보여줄 강의 목록도 메모이제이션
  const visibleLectures = useMemo(() =>
      filteredLectures.slice(0, page * PAGE_SIZE),
    [filteredLectures, page]
  );
  
  // 전공 목록도 메모이제이션
  const allMajors = useMemo(() =>
      [...new Set(lectures.map(lecture => lecture.major))],
    [lectures]
  );
  
  // 검색 옵션 변경 함수 메모이제이션
  const changeSearchOption = useCallback((field: keyof SearchOption, value: SearchOption[typeof field]) => {
    setPage(1);
    setSearchOptions(prev => ({ ...prev, [field]: value }));
    loaderWrapperRef.current?.scrollTo(0, 0);
  }, []);
  
  // 시간 슬롯 토글 함수 메모이제이션
  const toggleTimeSlot = useCallback((id: number) => {
    setSearchOptions(prev => {
      const newTimes = prev.times.includes(id)
        ? prev.times.filter(t => t !== id)
        : [...prev.times, id];
      return { ...prev, times: newTimes };
    });
    setPage(1);
    loaderWrapperRef.current?.scrollTo(0, 0);
  }, []);
  
  // 전공 토글 함수 메모이제이션
  const toggleMajor = useCallback((major: string) => {
    setSearchOptions(prev => {
      const newMajors = prev.majors.includes(major)
        ? prev.majors.filter(m => m !== major)
        : [...prev.majors, major];
      return { ...prev, majors: newMajors };
    });
    setPage(1);
    loaderWrapperRef.current?.scrollTo(0, 0);
  }, []);
  
  // 강의 추가 함수 메모이제이션
  const addSchedule = useCallback((lecture: Lecture) => {
    if (!searchInfo) return;
    
    const { tableId } = searchInfo;
    
    const schedules = parseSchedule(lecture.schedule).map(schedule => ({
      ...schedule,
      lecture
    }));
    
    setSchedulesMap(prev => ({
      ...prev,
      [tableId]: [...prev[tableId], ...schedules]
    }));
    
    onClose();
  }, [searchInfo, setSchedulesMap, onClose]);

  useEffect(() => {
    const start = performance.now();
    console.log('API 호출 시작: ', start)
    fetchAllLectures().then(results => {
      const end = performance.now();
      console.log('모든 API 호출 완료 ', end)
      console.log('API 호출에 걸린 시간(ms): ', end - start)
      setLectures(results.flatMap(result => result.data));
    })
  }, []);

// 무한 스크롤 설정
  useEffect(() => {
    const $loader = loaderRef.current;
    const $loaderWrapper = loaderWrapperRef.current;
    
    if (!$loader || !$loaderWrapper) {
      return;
    }
    
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setPage(prevPage => Math.min(lastPage, prevPage + 1));
        }
      },
      { threshold: 0, root: $loaderWrapper }
    );
    
    observer.observe($loader);
    
    return () => observer.unobserve($loader);
  }, [lastPage]);

  useEffect(() => {
    setSearchOptions(prev => ({
      ...prev,
      days: searchInfo?.day ? [searchInfo.day] : [],
      times: searchInfo?.time ? [searchInfo.time] : [],
    }))
    setPage(1);
  }, [searchInfo]);
  
  return (
    <Modal isOpen={Boolean(searchInfo)} onClose={onClose} size="6xl">
      <ModalOverlay/>
      <ModalContent maxW="90vw" w="1000px">
        <ModalHeader>수업 검색</ModalHeader>
        <ModalCloseButton/>
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <HStack spacing={4}>
              <FormControl>
                <FormLabel>검색어</FormLabel>
                <Input
                  placeholder="과목명 또는 과목코드"
                  value={searchOptions.query}
                  onChange={(e) => changeSearchOption('query', e.target.value)}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>학점</FormLabel>
                <Select
                  value={searchOptions.credits}
                  onChange={(e) => changeSearchOption('credits', e.target.value)}
                >
                  <option value="">전체</option>
                  <option value="1">1학점</option>
                  <option value="2">2학점</option>
                  <option value="3">3학점</option>
                </Select>
              </FormControl>
            </HStack>
            
            <HStack spacing={4}>
              <FormControl>
                <FormLabel>학년</FormLabel>
                <CheckboxGroup
                  value={searchOptions.grades}
                  onChange={(value) => changeSearchOption('grades', value.map(Number))}
                >
                  <HStack spacing={4}>
                    {[1, 2, 3, 4].map(grade => (
                      <Checkbox key={grade} value={grade}>{grade}학년</Checkbox>
                    ))}
                  </HStack>
                </CheckboxGroup>
              </FormControl>
              
              <FormControl>
                <FormLabel>요일</FormLabel>
                <CheckboxGroup
                  value={searchOptions.days}
                  onChange={(value) => changeSearchOption('days', value as string[])}
                >
                  <HStack spacing={4}>
                    {DAY_LABELS.map(day => (
                      <Checkbox key={day} value={day}>{day}</Checkbox>
                    ))}
                  </HStack>
                </CheckboxGroup>
              </FormControl>
            </HStack>
            
            <HStack spacing={4}>
              <FormControl>
                <FormLabel>시간</FormLabel>
                <CheckboxGroup
                  colorScheme="green"
                  value={searchOptions.times}
                >
                  <Wrap spacing={1} mb={2}>
                    {searchOptions.times.sort((a, b) => a - b).map(time => (
                      <Tag key={time} size="sm" variant="outline" colorScheme="blue">
                        <TagLabel>{time}교시</TagLabel>
                        <TagCloseButton
                          onClick={() => toggleTimeSlot(time)}
                        />
                      </Tag>
                    ))}
                  </Wrap>
                  <Stack spacing={2} overflowY="auto" h="100px" border="1px solid" borderColor="gray.200"
                         borderRadius={5} p={2}>
                    {TIME_SLOTS.map(({ id, label }) => (
                      <TimeSlotItem
                        key={id}
                        id={id}
                        label={label}
                        isSelected={searchOptions.times.includes(id)}
                        onToggle={toggleTimeSlot}
                      />
                    ))}
                  </Stack>
                </CheckboxGroup>
              </FormControl>
              
              <FormControl>
                <FormLabel>전공</FormLabel>
                <CheckboxGroup
                  colorScheme="green"
                  value={searchOptions.majors}
                >
                  <Wrap spacing={1} mb={2}>
                    {searchOptions.majors.map(major => (
                      <Tag key={major} size="sm" variant="outline" colorScheme="blue">
                        <TagLabel>{major.split("<p>").pop()}</TagLabel>
                        <TagCloseButton
                          onClick={() => toggleMajor(major)}
                        />
                      </Tag>
                    ))}
                  </Wrap>
                  <Stack spacing={2} overflowY="auto" h="100px" border="1px solid" borderColor="gray.200"
                         borderRadius={5} p={2}>
                    {allMajors.map(major => (
                      <MajorItem
                        key={major}
                        major={major}
                        isSelected={searchOptions.majors.includes(major)}
                        onToggle={toggleMajor}
                      />
                    ))}
                  </Stack>
                </CheckboxGroup>
              </FormControl>
            </HStack>
            <Text align="right">
              검색결과: {filteredLectures.length}개
            </Text>
            <Box>
              <Table>
                <Thead>
                  <Tr>
                    <Th width="100px">과목코드</Th>
                    <Th width="50px">학년</Th>
                    <Th width="200px">과목명</Th>
                    <Th width="50px">학점</Th>
                    <Th width="150px">전공</Th>
                    <Th width="150px">시간</Th>
                    <Th width="80px"></Th>
                  </Tr>
                </Thead>
              </Table>
              
              <Box overflowY="auto" maxH="500px" ref={loaderWrapperRef}>
                <Table size="sm" variant="striped">
                  <Tbody>
                    {visibleLectures.map((lecture, index) => (
                      <LectureRow
                        key={`${lecture.id}-${index}`}
                        lecture={lecture}
                        index={index}
                        onAddSchedule={addSchedule}
                      />
                    ))}
                  </Tbody>
                </Table>
                <Box ref={loaderRef} h="20px"/>
              </Box>
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default SearchDialog;