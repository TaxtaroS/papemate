import React, { useEffect, useRef, useState } from 'react';
import {
  AiRow,
  BottomPromptInput,
  Container,
  MainQAEngine,
  StreamMessageArea,
  TopMenuBar,
  UserRow,
} from './styles/Analysis.styles';
import {
  InviteCodePill,
  MainLayout,
  SaveInlinePanel,
  VisualArtifact,
  VisualPanel,
} from './styles/AnalysisLocal.styles';
import { analysisAPI, projectAPI } from '../services/api';
import {
  getProjectsKey,
  getRecentConversationsKey,
  readJson,
  SHARED_PROJECTS_KEY,
  writeJson,
} from '../utils/storageKeys';

const MAX_PROJECTS = 10;
const MAX_VISUALS = 10;
const MAX_RECENT_CONVERSATIONS = 50;

const visualStorageKinds = new Set(['table', 'graph', 'image', 'mindmap']);
const isVisualStorageItem = (visual) => visualStorageKinds.has(visual?.kind || 'chart');

const createInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const formatDate = () => new Date().toLocaleDateString('ko-KR').replace(/. /g, '.').slice(0, -1);
const getFileKey = (file) => `${file.name}-${file.size}-${file.lastModified || 0}`;

const toStoredFiles = (files) =>
  files.map((file) => ({
    id: `${file.name}-${file.size}-${file.lastModified || Date.now()}`,
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
  }));

const toStoredThread = (messages) =>
  messages
    .filter((message) => ['ai', 'user', 'asset', 'system'].includes(message.role))
    .map((message, index) => ({
      id: message.id || `thread-${Date.now()}-${index}`,
      role: message.role,
      title: message.title,
      text: message.text || message.title || '',
      rows: message.rows,
      kind: message.kind,
    }));

const splitMeaningfulLines = (text) =>
  String(text || '')
    .split(/\n+/)
    .map((line) => line.replace(/^[-\d.\s]+/, '').trim())
    .filter((line) => line.length > 8)
    .slice(0, 8);

const getLatestAnalysisText = (messages) => {
  const latest = [...messages].reverse().find((message) => message.role === 'ai' && message.text);
  return latest?.text || '업로드한 문서의 핵심 내용을 먼저 분석하거나 시각화를 생성하세요.';
};

const buildLocalFallbackAnswer = (question, files, messages) => {
  const sourceText = messages
    .filter((message) => ['ai', 'asset', 'system'].includes(message.role))
    .map((message) => [message.text, message.desc, ...(message.details || []).map((detail) => detail.val)].filter(Boolean).join(' '))
    .join('\n');
  const lines = splitMeaningfulLines(sourceText);
  const fileNames = files.length > 0 ? files.map((file) => file.name || '업로드 파일') : ['현재 대화 내용'];

  return [
    '로컬 기본 분석으로 처리했습니다.',
    '',
    '[핵심 내용 요약]',
    ...(lines.length
      ? lines.slice(0, 4).map((line, index) => `${index + 1}. ${line}`)
      : [
          `1. ${fileNames.join(', ')} 기준으로 분석 준비가 되었습니다.`,
          '2. 아직 충분한 문서 텍스트가 없어 파일명과 기존 대화 중심으로 정리했습니다.',
        ]),
    '',
    '[중요 문장 발췌]',
    ...(lines.length ? lines.slice(0, 6).map((line) => `- ${line}`) : ['- 아직 발췌할 본문 텍스트가 없습니다.']),
    '',
    '[질문 반영]',
    question ? `질문 "${question}"에 맞춰 내용을 우선 정리했습니다.` : '질문이 비어 있어 전체 요약 기준으로 정리했습니다.',
  ].join('\n');
};

const makeVisualRows = (fileNames, lines) => {
  const sources = fileNames.length > 0 ? fileNames : ['업로드 문서'];
  const baseLines = lines.length
    ? lines
    : ['핵심 주제와 연구 목적', '실험 결과와 수치 정보', '방법론 차이점', '추가 확인이 필요한 내용'];

  return Array.from({ length: Math.max(4, Math.min(6, sources.length + baseLines.length - 1)) }, (_, index) => ({
    label: sources[index % sources.length],
    point: baseLines[index % baseLines.length],
    score: Math.max(36, Math.min(96, 88 - index * 7 + ((index % 2) * 9))),
  }));
};

const buildVisualAsset = (type, files, messages) => {
  const analysisText = getLatestAnalysisText(messages);
  const lines = splitMeaningfulLines(analysisText);
  const fileNames = files.length > 0 ? files.map((file) => file.name) : ['업로드 문서'];
  const rows = makeVisualRows(fileNames, lines);
  const branches = (lines.length ? lines : ['핵심 내용', '실험 결과', '차이점', '추가 확인']).slice(0, 4);
  const titles = {
    table: '문서 핵심 비교표',
    graph: '키워드 중요도 그래프',
    image: '분석 요약 이미지',
    mindmap: '핵심 내용 마인드맵',
  };

  return {
    id: `visual-${type}-${Date.now()}`,
    role: 'asset',
    kind: type,
    title: titles[type] || '시각화 자료',
    text: `${fileNames.join(', ')} 기준으로 생성한 ${titles[type] || '시각화 자료'}입니다.`,
    desc: lines.slice(0, 2).join(' ') || '업로드 문서의 주요 내용을 시각화했습니다.',
    rows,
    branches,
    keywords: branches.flatMap((line) => line.split(/[,\s/]+/)).filter((word) => word.length >= 2).slice(0, 5),
    details: rows.map((row) => ({ lbl: row.label, val: `${row.point} (${row.score})` })),
    date: formatDate(),
    saved: false,
  };
};

function AnalysisC({ projectId, projectTitle, restoredData, onConversationChange }) {
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const recentConversationIdRef = useRef(
    restoredData?.conversationId || restoredData?.projectId || projectId || `conversation-${Date.now()}`
  );
  const [savedProjectId, setSavedProjectId] = useState(null);
  const effectiveProjectId = savedProjectId || projectId || restoredData?.projectId;
  const [files, setFiles] = useState([]);
  const [promptText, setPromptText] = useState('');
  const [llmProvider, setLlmProvider] = useState(() => sessionStorage.getItem('papermate.llmProvider') || 'openai');
  const [openaiApiKey, setOpenaiApiKey] = useState(() => sessionStorage.getItem('papermate.openaiApiKey') || '');
  const [googleApiKey, setGoogleApiKey] = useState(() => sessionStorage.getItem('papermate.googleApiKey') || '');
  const [messages, setMessages] = useState([
    { id: 'intro', role: 'ai', text: '분석을 시작하려면 파일을 업로드하거나 차트를 생성하세요.' },
  ]);
  const [visuals, setVisuals] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [generatedVisuals, setGeneratedVisuals] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [creatingVisualType, setCreatingVisualType] = useState(null);
  const [isProjectSaveOpen, setIsProjectSaveOpen] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState('');

  const currentInviteCode = currentProject?.inviteCode || restoredData?.inviteCode || '저장 후 생성';

  useEffect(() => {
    if (!restoredData) return;
    if (restoredData.conversationId || restoredData.projectId || restoredData.id) {
      recentConversationIdRef.current = restoredData.conversationId || restoredData.projectId || restoredData.id;
    }
    const restoredFiles = Array.isArray(restoredData.files) ? restoredData.files : [];
    const restoredThread = Array.isArray(restoredData.thread) && restoredData.thread.length > 0
      ? restoredData.thread
      : [
          restoredData.q && { id: 'restored-q', role: 'user', text: restoredData.q },
          restoredData.a && { id: 'restored-a', role: 'ai', text: restoredData.a },
        ].filter(Boolean);

    setFiles(restoredFiles);
    if (restoredThread.length > 0) setMessages(restoredThread);
    setCurrentProject(restoredData);
    setVisuals((restoredData.visuals || []).filter(isVisualStorageItem));
  }, [restoredData]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleProviderChange = (event) => {
    const nextProvider = event.target.value;
    setLlmProvider(nextProvider);
    sessionStorage.setItem('papermate.llmProvider', nextProvider);
  };

  const handleApiKeyChange = (event) => {
    const nextKey = event.target.value.trim();
    if (llmProvider === 'google') {
      setGoogleApiKey(nextKey);
      if (nextKey) sessionStorage.setItem('papermate.googleApiKey', nextKey);
      else sessionStorage.removeItem('papermate.googleApiKey');
      return;
    }
    setOpenaiApiKey(nextKey);
    if (nextKey) sessionStorage.setItem('papermate.openaiApiKey', nextKey);
    else sessionStorage.removeItem('papermate.openaiApiKey');
  };

  const clearApiKey = () => {
    if (llmProvider === 'google') {
      setGoogleApiKey('');
      sessionStorage.removeItem('papermate.googleApiKey');
      return;
    }
    setOpenaiApiKey('');
    sessionStorage.removeItem('papermate.openaiApiKey');
  };

  const copyInviteCode = async () => {
    if (!currentInviteCode || currentInviteCode === '저장 후 생성') {
      window.alert('프로젝트를 저장하면 초대코드가 생성됩니다.');
      return;
    }
    await navigator.clipboard?.writeText(currentInviteCode);
    window.alert(`초대코드가 복사되었습니다: ${currentInviteCode}`);
  };

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    const nextFiles = [...files, ...selectedFiles];
    setFiles(nextFiles);
    event.target.value = '';
  };

  const handleRemoveFile = (file) => {
    const nextFiles = files.filter((item) => getFileKey(item) !== getFileKey(file));
    setFiles(nextFiles);
  };

  const upsertRecentConversation = (nextMessages, question, nextFiles = files) => {
    const recentConversationsKey = getRecentConversationsKey();
    const savedRecents = readJson(recentConversationsKey, []);
    const conversationId = effectiveProjectId || recentConversationIdRef.current;
    const title =
      currentProject?.title ||
      projectTitle ||
      restoredData?.projectTitle ||
      question ||
      nextFiles[0]?.name?.replace(/\.[^.]+$/, '') ||
      '새 분석 대화';

    writeJson(recentConversationsKey, [
      {
        id: conversationId,
        conversationId,
        projectId: effectiveProjectId || null,
        title,
        question,
        date: formatDate(),
        inviteCode: currentProject?.inviteCode || restoredData?.inviteCode,
        files: toStoredFiles(nextFiles),
        thread: toStoredThread(nextMessages),
      },
      ...(Array.isArray(savedRecents)
        ? savedRecents.filter(
            (item) =>
              item.id !== conversationId &&
              item.conversationId !== conversationId &&
              item.projectId !== conversationId
          )
        : []),
    ].slice(0, MAX_RECENT_CONVERSATIONS));
  };

  const handleSendMessage = async () => {
    const nextQuestion = promptText.trim();
    if (!nextQuestion && files.length === 0) {
      window.alert('질문을 입력하거나 파일을 선택해주세요.');
      return;
    }

    const pendingFiles = [...files];
    const question = nextQuestion || '업로드한 문서를 요약해줘';
    setPromptText('');
    setFiles([]);

    const fileNames = pendingFiles.map((file) => file.name).filter(Boolean).join(', ');
    const fileMessage = pendingFiles.length > 0
      ? { id: `uploaded-files-${Date.now()}`, role: 'system', text: `업로드된 파일: ${fileNames}` }
      : null;
    const userMessage = { id: `user-${Date.now()}`, role: 'user', text: question };
    const messagesWithQuestion = [...messages, ...(fileMessage ? [fileMessage] : []), userMessage];
    const isNewConversation = recentConversationIdRef.current.startsWith('conversation-');

    if (isNewConversation) {
      recentConversationIdRef.current = `conv-${Date.now()}`;
    }

    setMessages(messagesWithQuestion);
    upsertRecentConversation(messagesWithQuestion, question, pendingFiles);
    if (isNewConversation && typeof onConversationChange === 'function') {
      onConversationChange(recentConversationIdRef.current);
    }
    setIsAnalyzing(true);

    try {
      const response = await analysisAPI.chat(question, pendingFiles, {
        provider: llmProvider,
        openaiApiKey,
        googleApiKey,
      });
      const providerNote = response.data?.provider
        ? `\n\n분석 엔진: ${response.data.provider === 'google' ? 'Google Gemini' : 'OpenAI'}${response.data.model ? ` (${response.data.model})` : ''}`
        : '';
      const answer = response.data?.answer || response.data?.summary || buildLocalFallbackAnswer(question, pendingFiles, messages);
      const successMessage = pendingFiles.length > 0
        ? { id: `upload-success-${Date.now()}`, role: 'system', text: `파일 전송 성공: ${fileNames}` }
        : null;
      const messagesWithAnswer = [
        ...messagesWithQuestion,
        ...(successMessage ? [successMessage] : []),
        { id: `ai-${Date.now()}`, role: 'ai', text: `${answer}${providerNote}` },
      ];
      setMessages(messagesWithAnswer);
      upsertRecentConversation(messagesWithAnswer, question, pendingFiles);
    } catch (error) {
      const serverMessage = error.response?.data?.detail || error.response?.data?.message || error.message || '알 수 없는 오류가 발생했습니다.';
      const failureMessage = pendingFiles.length > 0
        ? { id: `upload-failure-${Date.now()}`, role: 'system', text: `파일 전송 실패: ${serverMessage}` }
        : null;
      const messagesWithAnswer = [
        ...messagesWithQuestion,
        ...(failureMessage ? [failureMessage] : []),
        {
          id: `ai-${Date.now()}`,
          role: 'ai',
          text: [`서버 분석 실패: ${serverMessage}`, buildLocalFallbackAnswer(question, pendingFiles, messages)]
            .filter(Boolean)
            .join('\n\n'),
        },
      ];
      setMessages(messagesWithAnswer);
      upsertRecentConversation(messagesWithAnswer, question, pendingFiles);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateVisual = async (type) => {
    if (creatingVisualType) return;
    setCreatingVisualType(type);
    try {
      const response = await analysisAPI.createVisual(type, files, getLatestAnalysisText(messages));
      const newAsset = response.data?.visual || buildVisualAsset(type, files, messages);
      setGeneratedVisuals((prev) => [newAsset, ...prev].slice(0, MAX_VISUALS));
      setMessages((prev) => [...prev, newAsset]);
    } catch (error) {
      const newAsset = buildVisualAsset(type, files, messages);
      setGeneratedVisuals((prev) => [newAsset, ...prev].slice(0, MAX_VISUALS));
      setMessages((prev) => [
        ...prev,
        { id: `visual-error-${Date.now()}`, role: 'ai', text: '시각화 API와 연결할 수 없어 브라우저 기본 생성기로 임시 자료를 만들었습니다.' },
        newAsset,
      ]);
    } finally {
      setCreatingVisualType(null);
    }
  };

  const buildProjectRecord = (title, existingProject = null) => {
    const today = formatDate();
    const storedVisuals = [...generatedVisuals, ...visuals]
      .filter(isVisualStorageItem)
      .filter((visual, index, arr) => arr.findIndex((item) => item.id === visual.id) === index)
      .slice(0, MAX_VISUALS);

    return {
      ...(existingProject || {}),
      id: existingProject?.id || effectiveProjectId || `project-${Date.now()}`,
      type: files.some((file) => file.name?.toLowerCase().endsWith('.hwp') || file.name?.toLowerCase().endsWith('.hwpx')) ? 'HWP' : '분석',
      title,
      owner: localStorage.getItem('username') || 'Guest',
      updatedAt: today,
      date: today,
      charts: storedVisuals.length,
      isHwp: files.some((file) => file.name?.toLowerCase().endsWith('.hwp') || file.name?.toLowerCase().endsWith('.hwpx')),
      inviteCode: existingProject?.inviteCode || restoredData?.inviteCode || createInviteCode(),
      files: toStoredFiles(files),
      thread: toStoredThread(messages),
      visuals: storedVisuals,
    };
  };

  const persistProject = async (projectRecord) => {
    const projectsKey = getProjectsKey();
    const recentConversationsKey = getRecentConversationsKey();
    const savedProjects = readJson(projectsKey, []);
    const nextProjects = [
      projectRecord,
      ...(Array.isArray(savedProjects) ? savedProjects.filter((project) => project.id !== projectRecord.id) : []),
    ].slice(0, MAX_PROJECTS);

    const savedRecents = readJson(recentConversationsKey, []);
    const lastUserMessage = [...projectRecord.thread].reverse().find((item) => item.role === 'user');
    const nextRecent = {
      id: projectRecord.id,
      projectId: projectRecord.id,
      conversationId: recentConversationIdRef.current,
      title: projectRecord.title,
      question: lastUserMessage?.text || projectRecord.title,
      date: projectRecord.date,
      inviteCode: projectRecord.inviteCode,
    };

    writeJson(projectsKey, nextProjects);
    writeJson(recentConversationsKey, [
      nextRecent,
      ...(Array.isArray(savedRecents)
        ? savedRecents.filter(
            (item) =>
              item.projectId !== projectRecord.id &&
              item.id !== projectRecord.id &&
              item.id !== recentConversationIdRef.current &&
              item.conversationId !== recentConversationIdRef.current
          )
        : []),
    ].slice(0, MAX_RECENT_CONVERSATIONS));

    const sharedProjects = readJson(SHARED_PROJECTS_KEY, []);
    writeJson(SHARED_PROJECTS_KEY, [
      projectRecord,
      ...(Array.isArray(sharedProjects)
        ? sharedProjects.filter((project) => project.id !== projectRecord.id && project.inviteCode !== projectRecord.inviteCode)
        : []),
    ].slice(0, 100));

    try {
      await projectAPI.save(projectRecord);
    } catch (error) {
      console.warn('MongoDB project save skipped:', error);
    }
  };

  const openProjectSavePanel = () => {
    const defaultTitle =
      currentProject?.title ||
      projectTitle ||
      restoredData?.projectTitle ||
      files[0]?.name?.replace(/\.[^.]+$/, '') ||
      '새 분석 프로젝트';
    setProjectNameInput(defaultTitle);
    setIsProjectSaveOpen(true);
  };

  const handleSaveAnalysisProject = async () => {
    if (isSavingProject) return;
    const title = projectNameInput.trim();
    if (!title) {
      window.alert('프로젝트명을 입력해주세요.');
      return;
    }

    const savedProjects = readJson(getProjectsKey(), []);
    const existingProject = Array.isArray(savedProjects)
      ? savedProjects.find((project) => project.id === effectiveProjectId)
      : null;
    if (!existingProject && Array.isArray(savedProjects) && savedProjects.length >= MAX_PROJECTS) {
      window.alert('프로젝트는 최대 10개까지 저장됩니다. 새 프로젝트를 저장하려면 기존 프로젝트를 삭제해주세요.');
      return;
    }

    setIsSavingProject(true);
    try {
      const projectRecord = buildProjectRecord(title, existingProject);
      await persistProject(projectRecord);
      setSavedProjectId(projectRecord.id);
      recentConversationIdRef.current = projectRecord.id;
      setCurrentProject(projectRecord);
      setVisuals(projectRecord.visuals);
      setIsProjectSaveOpen(false);
      window.alert('프로젝트 페이지와 최근 대화에 저장되었습니다.');
    } finally {
      setIsSavingProject(false);
    }
  };

  const saveVisualAssetToProject = async (asset) => {
    if (!asset || isSavingProject) return;
    const savedProjects = readJson(getProjectsKey(), []);
    const existingProject = Array.isArray(savedProjects)
      ? savedProjects.find((project) => project.id === effectiveProjectId)
      : null;
    if (existingProject && (existingProject.visuals || []).filter(isVisualStorageItem).length >= MAX_VISUALS) {
      window.alert('시각화 보관함은 최대 10개까지 저장됩니다. 기존 시각화를 삭제해주세요.');
      return;
    }

    const title =
      existingProject?.title ||
      currentProject?.title ||
      projectTitle ||
      window.prompt('저장할 프로젝트명을 입력하세요.', files[0]?.name?.replace(/\.[^.]+$/, '') || '시각화 분석 프로젝트');
    if (!title?.trim()) return;

    setIsSavingProject(true);
    try {
      const savedAsset = { ...asset, saved: true, projectTitle: title.trim(), date: formatDate() };
      const projectRecord = buildProjectRecord(title.trim(), existingProject);
      projectRecord.visuals = [
        savedAsset,
        ...(projectRecord.visuals || []).filter((visual) => visual.id !== asset.id),
      ].slice(0, MAX_VISUALS);
      projectRecord.charts = projectRecord.visuals.length;
      await persistProject(projectRecord);
      setSavedProjectId(projectRecord.id);
      setCurrentProject(projectRecord);
      setVisuals(projectRecord.visuals);
      setGeneratedVisuals((prev) => prev.map((visual) => (visual.id === asset.id ? savedAsset : visual)));
      setMessages((prev) => prev.map((message) => (message.id === asset.id ? savedAsset : message)));
      window.alert('프로젝트 시각화 보관함에 저장되었습니다.');
    } finally {
      setIsSavingProject(false);
    }
  };

  const renderVisualPreview = (asset) => {
    if (asset.kind === 'table') {
      const rows = asset.rows?.length ? asset.rows : makeVisualRows(['업로드 문서'], splitMeaningfulLines(asset.text || asset.desc));
      return (
        <div className="mini-table">
          <div className="th">자료</div>
          <div className="th">핵심 내용</div>
          <div className="th">점수</div>
          {rows.slice(0, 6).flatMap((row) => [
            <div key={`${row.label}-label`}>{row.label}</div>,
            <div key={`${row.label}-point`}>{row.point}</div>,
            <div key={`${row.label}-score`}>{row.score}</div>,
          ])}
        </div>
      );
    }

    if (asset.kind === 'graph') {
      const rows = asset.rows?.length ? asset.rows : [{ label: '핵심', score: 70 }, { label: '비교', score: 62 }];
      const points = rows.slice(0, 5).map((row, index) => {
        const x = 12 + index * (76 / Math.max(1, Math.min(rows.length, 5) - 1));
        const y = 92 - Math.max(12, Math.min(row.score || 50, 96)) * 0.78;
        return `${x},${y}`;
      });
      return (
        <div className="mini-graph">
          <svg className="graph-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={points.join(' ')} />
            {points.map((point) => {
              const [cx, cy] = point.split(',');
              return <circle key={point} cx={cx} cy={cy} r="2.2" />;
            })}
          </svg>
          <div className="axis y-axis">점수</div>
          <div className="axis x-axis">자료</div>
          {rows.slice(0, 5).map((row) => (
            <div className="bar-wrap" key={row.label}>
              <div className="bar" style={{ height: `${Math.max(28, Math.min(row.score, 96))}%` }} />
              <strong>{row.score}</strong>
              <span>{row.label}</span>
            </div>
          ))}
        </div>
      );
    }

    if (asset.kind === 'mindmap') {
      const branches = asset.branches?.length ? asset.branches : splitMeaningfulLines(asset.text || asset.desc).slice(0, 4);
      return (
        <div className="mini-mindmap">
          <div className="center-node">{asset.title}</div>
          <div className="tree-trunk" aria-hidden="true"></div>
          <div className="branches">
            {branches.slice(0, 5).map((branch, index) => (
              <span className={`branch branch-${index + 1}`} key={`${branch}-${index}`}>{branch}</span>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="mini-image">
        <div className="image-title">{asset.desc || asset.title}</div>
        <div className="chips">
          {(asset.keywords || []).slice(0, 6).map((keyword) => <span key={keyword}>{keyword}</span>)}
        </div>
      </div>
    );
  };

  const renderVisualArtifact = (asset, compact = false) => (
    <VisualArtifact>
      <div className="artifact-head">
        <h4>{asset.title}</h4>
        <span>{asset.saved ? '저장됨' : '생성됨'}</span>
      </div>
      <div className="artifact-body">
        {!compact && <p className="artifact-desc">{asset.text}</p>}
        {renderVisualPreview(asset)}
      </div>
      {!compact && (
        <button
          type="button"
          className="save-visual"
          onClick={() => saveVisualAssetToProject(asset)}
          disabled={asset.saved || isSavingProject}
        >
          {asset.saved ? '프로젝트에 저장됨' : '프로젝트 시각화 보관함에 저장하기'}
        </button>
      )}
    </VisualArtifact>
  );

  const visibleVisuals = [...generatedVisuals, ...visuals.filter((visual) => !generatedVisuals.some((item) => item.id === visual.id))];

  return (
    <Container>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} multiple />
      <MainLayout>
        <VisualPanel>
          <div className="title">시각화 보관함</div>
          <p className="hint">현재 업로드 문서와 최근 분석 답변을 기준으로 자료를 만듭니다.</p>
          <div className="asset-list">
            {visibleVisuals.length === 0 ? (
              <div className="asset-item">
                <strong>아직 생성된 자료가 없습니다.</strong>
                <span>아래 버튼으로 표, 그래프, 이미지, 마인드맵을 만들 수 있어요.</span>
              </div>
            ) : visibleVisuals.map((visual, index) => (
              <div key={`${visual.id}-${index}`} className="asset-item">
                <strong>{visual.title}</strong>
                <span>{visual.saved ? '프로젝트 보관함 저장됨' : '채팅창에 생성됨'}</span>
                {renderVisualArtifact(visual, true)}
              </div>
            ))}
          </div>
          <div className="visual-actions">
            <button className="action-btn" type="button" onClick={() => handleCreateVisual('table')}>
              <i className="fa-solid fa-table"></i>{creatingVisualType === 'table' ? '생성 중' : '표'}
            </button>
            <button className="action-btn" type="button" onClick={() => handleCreateVisual('graph')}>
              <i className="fa-solid fa-chart-column"></i>{creatingVisualType === 'graph' ? '생성 중' : '그래프'}
            </button>
            <button className="action-btn" type="button" onClick={() => handleCreateVisual('image')}>
              <i className="fa-regular fa-image"></i>{creatingVisualType === 'image' ? '생성 중' : '이미지'}
            </button>
            <button className="action-btn" type="button" onClick={() => handleCreateVisual('mindmap')}>
              <i className="fa-solid fa-diagram-project"></i>{creatingVisualType === 'mindmap' ? '생성 중' : '마인드맵'}
            </button>
          </div>
        </VisualPanel>

        <MainQAEngine>
          <TopMenuBar>
            <h2>AI 분석 Q&amp;A</h2>
            <div className="actions">
              <div className="api-key-box">
                <i className="fa-solid fa-key"></i>
                <select value={llmProvider} onChange={handleProviderChange} aria-label="LLM 제공자 선택">
                  <option value="openai">OpenAI</option>
                  <option value="google">Google</option>
                </select>
                <input
                  type="password"
                  value={llmProvider === 'google' ? googleApiKey : openaiApiKey}
                  placeholder={llmProvider === 'google' ? 'Google Gemini API key' : 'OpenAI API key'}
                  onChange={handleApiKeyChange}
                  autoComplete="off"
                />
                {((llmProvider === 'google' && googleApiKey) || (llmProvider === 'openai' && openaiApiKey)) && (
                  <button type="button" className="clear-key" onClick={clearApiKey} aria-label="API 키 지우기">
                    ×
                  </button>
                )}
              </div>
              <button type="button" onClick={openProjectSavePanel} disabled={isSavingProject}>
                프로젝트 저장
              </button>
              <InviteCodePill type="button" onClick={copyInviteCode} title="클릭하면 초대코드가 복사됩니다.">
                <span>초대코드</span>
                <strong>{currentInviteCode}</strong>
              </InviteCodePill>
            </div>
          </TopMenuBar>

          {isProjectSaveOpen && (
            <SaveInlinePanel>
              <input
                value={projectNameInput}
                placeholder="프로젝트 제목을 입력하세요."
                onChange={(event) => setProjectNameInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSaveAnalysisProject();
                  if (event.key === 'Escape') setIsProjectSaveOpen(false);
                }}
                autoFocus
              />
              <button type="button" className="primary" onClick={handleSaveAnalysisProject} disabled={isSavingProject}>
                {isSavingProject ? '저장 중...' : '저장'}
              </button>
              <button type="button" onClick={() => setIsProjectSaveOpen(false)}>
                취소
              </button>
            </SaveInlinePanel>
          )}

          <StreamMessageArea ref={scrollRef}>
            {messages.map((message) => (
              <div key={message.id}>
                {message.role === 'ai' ? (
                  <AiRow><div className="ai-box">{message.text}</div></AiRow>
                ) : message.role === 'user' ? (
                  <UserRow><div className="user-box">{message.text}</div></UserRow>
                ) : message.role === 'asset' ? (
                  renderVisualArtifact(message)
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8' }}>{message.text}</div>
                )}
              </div>
            ))}
            {isAnalyzing && <AiRow><div className="ai-box">GPT가 문서를 분석하고 있습니다...</div></AiRow>}
          </StreamMessageArea>

          <BottomPromptInput>
            {files.length > 0 && (
              <div className="file-island-list" aria-label="업로드된 파일 목록">
                {files.map((file) => (
                  <div className="file-island" key={getFileKey(file)} title={file.name}>
                    <i className="fa-regular fa-file-lines"></i>
                    <span>{file.name}</span>
                    <button
                      type="button"
                      className="remove-file"
                      onClick={() => handleRemoveFile(file)}
                      aria-label={`${file.name} 삭제`}
                      title="파일 삭제"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="input-wrapper">
              <button
                type="button"
                className="clip-upload"
                onClick={() => fileInputRef.current?.click()}
                aria-label="파일 업로드"
                title="파일 업로드"
              >
                <i className="fa-solid fa-paperclip"></i>
              </button>
              <input
                value={promptText}
                placeholder={files.length > 0 ? `${files.length}개 파일 기준으로 질문을 입력하세요...` : '분석 질문을 입력하세요...'}
                onChange={(event) => setPromptText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' || event.nativeEvent?.isComposing) return;
                  event.preventDefault();
                  handleSendMessage();
                }}
              />
              <button type="button" onClick={handleSendMessage}>전송</button>
            </div>
          </BottomPromptInput>
        </MainQAEngine>
      </MainLayout>
    </Container>
  );
}

export default AnalysisC;
