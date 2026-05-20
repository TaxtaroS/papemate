import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AiRow,
  BottomPromptInput,
  ChartSaveModal,
  Container,
  InviteCodeBadge,
  LeftUploadPanel,
  LoadingSection,
  MainQAEngine,
  ModalBackdrop,
  StreamMessageArea,
  TopMenuBar,
  UserRow,
} from './styles/Analysis.styles';
import { analysisAPI } from '../services/api';
import {
  getProjectsKey,
  getRecentConversationsKey,
  getSharedRoomKey,
  getShareRoomKey,
  readJson,
  SHARED_PROJECTS_KEY,
  writeJson,
} from '../utils/storageKeys';

// Analysis 페이지에서 쓰는 주요 라이브러리/기능
// - React Hooks: useState, useEffect, useMemo, useRef로 화면 상태와 DOM 참조 관리
// - styled-components: ./styles/Analysis.styles.js에 분리된 UI 스타일 사용
// - analysisAPI: axios 기반 백엔드 호출 객체, FastAPI의 /api/analysis/chat와 연결
// - localStorage: 배포 전 임시 저장소, 프로젝트/최근대화/공유방 데이터를 브라우저에 저장

const ACCEPTED_EXTENSIONS = ['hwp', 'hwpx', 'pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'txt', 'doc', 'docx'];

// 프로젝트마다 붙는 초대코드입니다.
// 헷갈리기 쉬운 I/O/1/0 같은 문자는 제외한 문자 집합을 사용합니다.
const createInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const getFileExtension = (filename) => filename.split('.').pop()?.toLowerCase() || '';

const formatDate = () => new Date().toLocaleDateString('ko-KR').replace(/. /g, '.').slice(0, -1);

const formatTime = () => {
  const now = new Date();
  return `오늘 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

// 분석 결과를 프로젝트 페이지의 "시각화 보관함"에 넣기 위한 데이터 형태로 변환합니다.
// 지금은 실제 이미지 파일이 아니라 표/차트/그래프 미리보기용 메타데이터를 저장합니다.
const makeVisualRecord = ({ projectId, projectTitle, inviteCode, kind, question, answer, files }) => ({
  id: `visual-${kind}-${Date.now()}`,
  projectId,
  projectTitle,
  kind,
  icon: kind === 'table' ? 'fa-table' : kind === 'graph' ? 'fa-chart-line' : 'fa-chart-pie',
  title: `${projectTitle} ${kind === 'table' ? '표' : kind === 'graph' ? '그래프' : '차트'}`,
  date: formatDate(),
  desc: answer || '분석 대화에서 생성한 시각화 자료입니다.',
  details: [
    { lbl: '프로젝트', val: projectTitle },
    { lbl: '초대코드', val: inviteCode },
    { lbl: '질문', val: question || '저장된 분석 질문' },
    { lbl: '문서', val: `${files.length}개` },
  ],
});

// navigator.clipboard는 브라우저 기본 클립보드 API입니다.
// 일부 환경에서 막힐 수 있어 textarea를 이용한 구형 복사 방식도 fallback으로 둡니다.
const copyText = async (text) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
  window.alert(`초대코드가 복사되었습니다: ${text}`);
};

// 프로젝트 카드나 공유 페이지에서 "이어서 작업"으로 들어올 때,
// 저장된 thread 데이터를 다시 채팅 메시지 배열로 바꿉니다.
const buildRestoredMessages = (restoredData) => {
  if (!restoredData?.thread?.length) {
    return [
      {
        id: 'restored-ai',
        role: 'ai',
        text: restoredData?.a || '저장된 분석 대화를 불러왔습니다.',
      },
      {
        id: 'restored-user',
        role: 'user',
        text: restoredData?.q || '저장된 질문',
      },
    ];
  }

  return restoredData.thread
    .filter((item) => item.role === 'ai' || item.role === 'user' || item.role === 'asset')
    .map((item, index) => ({
      id: `restored-${item.id || index}`,
      role: item.role === 'user' ? 'user' : 'ai',
      text: item.role === 'asset'
        ? `${item.title || '분석 자료'}\n${item.text || ''}`
        : item.text || item.title || '',
    }))
    .filter((message) => message.text);
};

function AnalysisC({ restoredData, clearRestore }) {
  // useRef는 렌더링과 무관하게 DOM 요소를 직접 가리킬 때 씁니다.
  // fileInputRef: 숨겨진 파일 input 열기, messageAreaRef: 채팅 자동 스크롤
  const fileInputRef = useRef(null);
  const messageAreaRef = useRef(null);

  // useState는 화면에서 바뀌는 값을 저장합니다.
  // files/messages/promptText가 바뀔 때마다 React가 화면을 다시 그립니다.
  const [files, setFiles] = useState([]);
  const [inviteCode, setInviteCode] = useState(() => restoredData?.inviteCode || createInviteCode());
  const [activeProjectId, setActiveProjectId] = useState(restoredData?.projectId || null);
  const [activeProjectTitle, setActiveProjectTitle] = useState(restoredData?.projectTitle || '');
  const [dropError, setDropError] = useState('');
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [question, setQuestion] = useState('세 논문의 정확도 성능을 비교해줘');
  const [messages, setMessages] = useState([
    {
      id: 'intro',
      role: 'ai',
      text: '문서를 업로드하면 핵심 내용, 실험 결과 비교, 방법론 차이점, 중요 내용을 발췌해드릴 수 있어요.',
    },
  ]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isComposingPrompt, setIsComposingPrompt] = useState(false);

  // useMemo는 계산 결과를 캐싱합니다.
  // restoredData가 바뀌지 않으면 파일명 목록을 매번 새로 만들지 않습니다.
  const restoredFileNames = useMemo(() => restoredData?.files || [], [restoredData]);

  const currentQuestion = [...messages].reverse().find((message) => message.role === 'user')?.text || question;
  const currentAnswer = [...messages].reverse().find((message) => message.role === 'ai')?.text || restoredData?.a || '';

  const uploadSummary = useMemo(() => {
    if (files.length === 0 && restoredFileNames.length > 0) return `복원된 문서 ${restoredFileNames.length}개`;
    if (files.length === 0) return '문서를 올리면 분석 목록에 추가됩니다.';

    const typeCounts = files.reduce((acc, file) => {
      const ext = getFileExtension(file.name).toUpperCase() || 'ETC';
      acc[ext] = (acc[ext] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(typeCounts).map(([type, count]) => `${type} ${count}`).join(' · ');
  }, [files, restoredFileNames]);

  // 메시지가 추가되면 채팅창을 최신 메시지 위치로 자동 스크롤합니다.
  useEffect(() => {
    if (!messageAreaRef.current) return;
    messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
  }, [messages, isAnalyzing, restoredData]);

  // 프로젝트 페이지나 공유 페이지에서 들어온 restoredData를 실제 채팅 상태로 주입합니다.
  // 그래서 단순 "과거 복원 화면"이 아니라 이어서 질문하고 저장할 수 있습니다.
  useEffect(() => {
    if (!restoredData) return;
    setActiveProjectId(restoredData.projectId || null);
    setActiveProjectTitle(restoredData.projectTitle || '');
    setInviteCode(restoredData.inviteCode || createInviteCode());
    setMessages(buildRestoredMessages(restoredData));
    setQuestion(restoredData.q || restoredData.projectTitle || '저장된 프로젝트 이어서 작업');
  }, [restoredData]);

  // 새 작업 버튼을 누르면 프로젝트 연결을 끊고 분석 페이지를 초기 상태로 돌립니다.
  const startNewWork = () => {
    setActiveProjectId(null);
    setActiveProjectTitle('');
    setInviteCode(createInviteCode());
    setFiles([]);
    setMessages([
      {
        id: 'intro',
        role: 'ai',
        text: '문서를 업로드하면 핵심 내용, 실험 결과 비교, 방법론 차이점, 중요 내용을 발췌해드릴 수 있어요.',
      },
    ]);
    setQuestion('세 논문의 정확도 성능을 비교해줘');
    clearRestore?.();
  };

  // 드래그 앤 드롭 또는 파일 선택으로 들어온 파일을 검증하고 상태에 추가합니다.
  // 같은 파일이 중복으로 들어가지 않도록 name-size 조합으로 걸러냅니다.
  const addFiles = (incomingFiles) => {
    const nextFiles = Array.from(incomingFiles || []);
    const accepted = [];
    const rejected = [];

    nextFiles.forEach((file) => {
      const ext = getFileExtension(file.name);
      if (ACCEPTED_EXTENSIONS.includes(ext)) accepted.push(file);
      else rejected.push(file.name);
    });

    setDropError(rejected.length > 0 ? `지원하지 않는 파일: ${rejected.join(', ')}` : '');
    if (accepted.length === 0) return;

    setFiles((prev) => {
      const existingKeys = new Set(prev.map((file) => `${file.name}-${file.size}`));
      const uniqueFiles = accepted.filter((file) => !existingKeys.has(`${file.name}-${file.size}`));
      return [...prev, ...uniqueFiles];
    });
  };

  const removeFile = (targetFile) => {
    setFiles((prev) => prev.filter((file) => file !== targetFile));
  };

  const handleDrop = (event) => {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  };

  // 차트 저장 팝업의 핵심 함수입니다.
  // 새 프로젝트면 프로젝트를 만들고, 기존 프로젝트면 thread와 visuals를 이어 붙입니다.
  const saveProjectAndVisual = (kind = 'chart') => {
    const title = activeProjectTitle || window.prompt('프로젝트 제목을 입력하세요.');
    if (!title?.trim()) return;

    const projectId = activeProjectId || `analysis-${Date.now()}`;
    const fileNames = files.map((file) => file.name);
    const savedThread = messages
      .filter((message) => message.id !== 'intro')
      .map((message, index) => ({
        id: index + 1,
        role: message.role,
        text: message.text,
        time: formatTime(),
      }));
    const thread = savedThread.length > 0
      ? savedThread
      : [
          {
            id: 1,
            role: 'ai',
            text: currentAnswer,
            time: formatTime(),
          },
          {
            id: 2,
            role: 'user',
            text: currentQuestion,
            time: formatTime(),
          },
        ];

    const projectsKey = getProjectsKey();
    const recentConversationsKey = getRecentConversationsKey();
    const shareRoomKey = getShareRoomKey();
    const savedProjects = readJson(projectsKey, []);
    const existingProject = Array.isArray(savedProjects)
      ? savedProjects.find((project) => project.id === projectId)
      : null;
    const mergedFiles = Array.from(new Set([...(existingProject?.files || []), ...fileNames]));
    const visualRecord = makeVisualRecord({
      projectId,
      projectTitle: title.trim(),
      inviteCode,
      kind,
      question: currentQuestion,
      answer: currentAnswer,
      files: mergedFiles,
    });

    const newProject = {
      ...(existingProject || {}),
      id: projectId,
      title: title.trim(),
      type: files.length > 0 ? `${getFileExtension(files[0].name).toUpperCase()} x ${files.length}` : existingProject?.type || '문서',
      updatedAt: formatDate(),
      date: formatDate(),
      charts: (existingProject?.visuals || []).length + 1,
      isHwp: existingProject?.isHwp || files.some((file) => ['hwp', 'hwpx'].includes(getFileExtension(file.name))),
      inviteCode,
      files: mergedFiles,
      thread: [
        ...thread,
        {
          id: thread.length + 1,
          role: 'asset',
          title: '문서 분석 요약 차트',
          text: '분석.요약 페이지에서 저장한 차트와 업로드 문서 정보입니다.',
          rows: [
            ['항목', '값'],
            ['업로드 문서', `${fileNames.length}개`],
            ['초대코드', inviteCode],
            ['질문', currentQuestion],
          ],
          time: formatTime(),
        },
      ],
      visuals: [visualRecord, ...(existingProject?.visuals || [])].slice(0, 30),
      createdAt: existingProject?.createdAt || new Date().toISOString(),
    };

    writeJson(projectsKey, [
      newProject,
      ...savedProjects.filter((project) => project.id !== projectId),
    ].slice(0, 20));

    const sharedProjects = readJson(SHARED_PROJECTS_KEY, []);
    // 초대코드로 다른 아이디가 프로젝트를 찾을 수 있도록 전역 프로젝트 인덱스도 갱신합니다.
    writeJson(SHARED_PROJECTS_KEY, [
      newProject,
      ...sharedProjects.filter((project) => project.id !== newProject.id && project.inviteCode !== newProject.inviteCode),
    ].slice(0, 100));

    const savedRecents = readJson(recentConversationsKey, []);
    // 사이드바 최근 대화 목록에 표시할 최소 정보만 저장합니다.
    writeJson(recentConversationsKey, [
      {
        id: projectId,
        title: title.trim(),
        question: currentQuestion,
        projectId,
        createdAt: new Date().toISOString(),
      },
      ...savedRecents.filter((item) => item.projectId !== projectId),
    ].slice(0, 5));

    const savedRoom = readJson(shareRoomKey, null);
    // 내 계정의 공유 페이지에서도 바로 보이게 개인 공유방 기록을 갱신합니다.
    writeJson(shareRoomKey, {
      joinedCode: savedRoom?.joinedCode || '',
      members: savedRoom?.members || [],
      comments: savedRoom?.comments || [],
      loadedProjectIds: Array.from(new Set([...(savedRoom?.loadedProjectIds || []), projectId])),
    });

    const sharedRoomKey = getSharedRoomKey(inviteCode);
    const savedSharedRoom = readJson(sharedRoomKey, null);
    // 다른 아이디가 같은 초대코드로 들어왔을 때 볼 수 있는 초대코드별 공유방을 갱신합니다.
    writeJson(sharedRoomKey, {
      inviteCode,
      joinedCode: inviteCode,
      members: savedSharedRoom?.members || [],
      comments: savedSharedRoom?.comments || [],
      loadedProjectIds: Array.from(new Set([...(savedSharedRoom?.loadedProjectIds || []), projectId])),
    });

    setActiveProjectId(projectId);
    setActiveProjectTitle(newProject.title);
    setIsChartModalOpen(false);
    window.alert(`"${newProject.title}" 프로젝트에 ${visualRecord.title} 자료를 저장했습니다.`);
  };

  // 다운로드는 서버 저장이 아니라 브라우저 Blob API로 JSON 파일을 만들어 내려받게 합니다.
  const handleDownloadChart = () => {
    const chartPayload = {
      title: '문서 분석 요약 차트',
      inviteCode,
      question: currentQuestion,
      files: files.map((file) => ({ name: file.name, size: file.size, type: file.type || 'unknown' })),
      downloadedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(chartPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `papermate-analysis-${inviteCode}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 질문 전송 흐름입니다.
  // 파일이 있으면 FormData를 만들어 analysisAPI.chat으로 백엔드에 보내고,
  // 응답을 messages 배열에 AI 말풍선으로 추가합니다.
  const handlePromptSubmit = async () => {
    const nextQuestion = promptText.trim();
    if (!nextQuestion || isAnalyzing) return;

    if (files.length === 0) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: 'user', text: nextQuestion },
        { id: Date.now() + 1, role: 'ai', text: '먼저 PDF, HWPX, TXT, DOCX 또는 이미지 파일을 업로드해주세요.' },
      ]);
      setPromptText('');
      return;
    }

    setQuestion(nextQuestion);
    setPromptText('');
    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', text: nextQuestion }]);
    setIsAnalyzing(true);

    try {
      const response = await analysisAPI.chat(nextQuestion, files);
      const sourceLabel = response.data.llm_used
        ? `\n\n분석 엔진: LLM (${response.data.model})`
        : '\n\n분석 엔진: 기본 문서 추출';
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'ai', text: `${response.data.answer}${sourceLabel}` }]);
    } catch (error) {
      const message = error.response?.data?.detail || '분석 서버와 연결할 수 없습니다. 백엔드를 실행한 뒤 다시 시도해주세요.';
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'ai', text: message }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Container>
      <LeftUploadPanel>
        <div
          className="drop-zone"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".hwp,.hwpx,.pdf,image/*,.txt,.doc,.docx"
            onChange={(event) => addFiles(event.target.files)}
          />
          <i className="fa-solid fa-cloud-arrow-up"></i>
          <div>Drag & Drop<br /><span>HWP, HWPX, PDF, 이미지 지원</span></div>
          {dropError && <p className="drop-error">{dropError}</p>}
        </div>

        {files.length === 0 && restoredFileNames.length === 0 ? (
          <div className="empty-file">업로드된 문서가 없습니다.</div>
        ) : files.length === 0 ? (
          restoredFileNames.map((filename) => (
            <div className="file-item restored" key={filename}>
              <i className="fa-regular fa-file-lines"></i>
              <span>{filename}</span>
              <span className="size">복원됨</span>
            </div>
          ))
        ) : (
          files.map((file) => (
            <div className="file-item" key={`${file.name}-${file.size}`}>
              <i className="fa-regular fa-file-lines"></i>
              <span>{file.name}</span>
              <span className="size">{(file.size / 1024).toFixed(1)}KB</span>
              <button type="button" onClick={() => removeFile(file)} aria-label={`${file.name} 삭제`}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          ))
        )}

        <div className="status-bar">
          <i className="fa-solid fa-circle-notch fa-spin"></i> {uploadSummary}
        </div>
      </LeftUploadPanel>

      <MainQAEngine>
        <TopMenuBar>
          <h2>
            AI 분석 Q&A
            {activeProjectId && <span className="restore-badge">프로젝트 이어서 작업</span>}
          </h2>
          <div className="actions">
            {activeProjectId && <button type="button" onClick={startNewWork} className="danger">새 작업</button>}
            <button type="button" onClick={() => setIsChartModalOpen(true)}>
              <i className="fa-regular fa-floppy-disk"></i> 차트 저장
            </button>
            <InviteCodeBadge
              title="클릭하면 초대코드가 복사됩니다"
              role="button"
              tabIndex={0}
              onClick={() => copyText(inviteCode)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') copyText(inviteCode);
              }}
            >
              <span>초대코드</span>
              <strong>{inviteCode}</strong>
            </InviteCodeBadge>
          </div>
        </TopMenuBar>

        <StreamMessageArea ref={messageAreaRef}>
          {messages.map((message) => (
            message.role === 'user' ? (
              <UserRow key={message.id}>
                <div className="user-box">{message.text}</div>
              </UserRow>
            ) : (
              <AiRow key={message.id}>
                <div className="ai-icon"><i className="fa-solid fa-robot"></i></div>
                <div className="ai-box">{message.text}</div>
              </AiRow>
            )
          ))}

          {isAnalyzing && (
            <LoadingSection>
              <i className="fa-solid fa-rotate spinner"></i>
              <span>문서에서 핵심 문장과 비교 포인트를 추출하고 있습니다...</span>
            </LoadingSection>
          )}
        </StreamMessageArea>

        <BottomPromptInput>
          <div className="input-wrapper">
            <i className="fa-solid fa-plus" style={{ marginRight: '14px' }}></i>
            <input
              type="text"
              value={promptText}
              placeholder="핵심 내용, 실험 결과 비교, 차이점 분석처럼 요청해보세요..."
              onChange={(event) => setPromptText(event.target.value)}
              onCompositionStart={() => setIsComposingPrompt(true)}
              onCompositionEnd={() => setIsComposingPrompt(false)}
              onKeyDown={(event) => {
                const isComposing = event.nativeEvent.isComposing || isComposingPrompt;
                if (event.key === 'Enter' && !isComposing) handlePromptSubmit();
              }}
            />
            <button type="button" onClick={handlePromptSubmit} aria-label="질문 보내기">
              <i className="fa-regular fa-paper-plane"></i>
            </button>
          </div>
        </BottomPromptInput>
      </MainQAEngine>

      {isChartModalOpen && (
        <ModalBackdrop onMouseDown={() => setIsChartModalOpen(false)}>
          <ChartSaveModal onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>차트 저장</h3>
              <button type="button" onClick={() => setIsChartModalOpen(false)} aria-label="팝업 닫기">×</button>
            </div>
            <p>현재 분석 내용을 표, 차트, 그래프 자료로 프로젝트 시각화 보관함에 저장할 수 있습니다.</p>
            <div className="modal-actions">
              <button type="button" onClick={() => saveProjectAndVisual('table')}>표 저장</button>
              <button type="button" onClick={() => saveProjectAndVisual('chart')}>차트 저장</button>
              <button type="button" onClick={() => saveProjectAndVisual('graph')}>그래프 저장</button>
              <button type="button" onClick={handleDownloadChart}>다운로드</button>
            </div>
          </ChartSaveModal>
        </ModalBackdrop>
      )}
    </Container>
  );
}

export default AnalysisC;
