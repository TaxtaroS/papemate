import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Container,
  MainTimelineContent,
  TimelineInner,
  ProjectLoadBar,
  SectionTitle,
  TimelineWrapper,
  TimelineNode,
  ResultTable,
  RightCoopPanel,
  MembersBox,
  ChatTimelineFeed,
  TalkBubble,
  FooterInputBox,
  ProjectPickerOverlay,
  ProjectPickerPanel,
  ProjectPickerGrid,
  ProjectPickerCard
} from './styles/Share.styles';
import {
  getProjectsKey,
  getSharedRoomKey,
  getShareRoomKey,
  readJson,
  SHARED_PROJECTS_KEY,
  writeJson,
} from '../utils/storageKeys';

// Share 페이지에서 쓰는 주요 라이브러리/기능
// - React Hooks: 참여자/코멘트/불러온 프로젝트 상태를 관리
// - styled-components: ./styles/Share.styles.js에 공유 화면 UI 스타일 분리
// - localStorage: 배포 전 임시 공유 저장소
// - CustomEvent: 같은 브라우저 안에서 저장소 변경을 즉시 감지하기 위한 이벤트

const legacyDummyProjectIds = new Set([
  1,
  2,
  3,
  ['image', 'classification'].join('-'),
  ['nlp', 'research'].join('-'),
  ['paper', 'analysis'].join('-'),
]);

// 공유방의 기본 상태입니다.
// 초대코드, 참여자, 불러온 프로젝트 순서, 코멘트 기록을 한 묶음으로 localStorage에 저장합니다.
const fallbackRoom = {
  inviteCode: '',
  joinedCode: '',
  members: [],
  loadedProjectIds: [],
  comments: [],
};

// 화면 전체는 좌측 분석 타임라인과 우측 협업 채팅 패널로 나뉩니다.

// 좌측 본문 영역입니다. 프로젝트 대화 기록을 세로 타임라인으로 보여줍니다.

// 본문이 너무 넓게 퍼지지 않도록 최대 폭을 제한하는 내부 래퍼입니다.

// 내 프로젝트에서 저장된 프로젝트를 선택해서 공유 본문에 누적시키는 상단 바입니다.

// 타임라인 카드 위에 표시되는 작은 섹션 제목입니다.

// 타임라인의 세로 축과 카드 목록을 감싸는 영역입니다.

// 타임라인의 개별 노드입니다. 질문, AI 답변, 표/이미지 같은 분석 산출물을 같은 카드 형태로 표시합니다.

// 분석 비교창에서 생성된 표 형태 결과를 공유 화면에 같이 보여주기 위한 테이블 스타일입니다.

// 우측 협업 패널입니다. 프로젝트 불러오기, 초대코드 입력, 참여자, 코멘트 채팅이 들어갑니다.

// 초대코드를 입력한 사용자만 참여자로 표시되는 영역입니다.

// 공유방 코멘트 로그가 쌓이는 스크롤 영역입니다.

// 코멘트 말풍선입니다. 현재 사용자의 말풍선과 다른 참여자의 말풍선을 좌우로 구분합니다.

// 우측 패널 하단의 코멘트 입력창입니다.

// 프로젝트 불러오기 버튼을 눌렀을 때 뜨는 선택창입니다.
// 실제 프로젝트 페이지처럼 카드 목록에서 원하는 프로젝트를 골라 공유 본문에 추가합니다.

const sanitizeProjects = (projects) =>
  projects.filter((project) => !legacyDummyProjectIds.has(project.id));

const sanitizeRoom = (room) => ({
  ...fallbackRoom,
  ...room,
  loadedProjectIds: (room.loadedProjectIds || []).filter((id) => !legacyDummyProjectIds.has(id)),
  comments: (room.comments || []).filter(
    (comment) =>
      ![
        '논문의 정확성을 비교해주신 자료를 저한테 메일로 보내주세요.',
        '네, 알겠습니다.',
      ].includes(comment.text)
  ),
});

// 코멘트를 작성한 시각을 화면 표시 형식으로 변환합니다.
const formatTime = () => {
  const now = new Date();
  return `오늘 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

function ShareC({ onRestoreTrigger, username = 'Guest' }) {
  // 내 프로젝트 목록은 현재 로그인 계정의 개인 저장소에서 읽습니다.
  // 직접 만든 프로젝트만 프로젝트 선택창에 보이게 하기 위한 목록입니다.
  const loadOwnProjects = () => {
    const saved = readJson(getProjectsKey(), []);
    return Array.isArray(saved) ? sanitizeProjects(saved) : [];
  };

  // sharedProjects는 초대코드 검색용 전역 인덱스입니다.
  // 다른 아이디가 만든 프로젝트라도 초대코드를 알면 여기서 찾을 수 있습니다.
  const loadSharedProjects = () => {
    const saved = readJson(SHARED_PROJECTS_KEY, []);
    return Array.isArray(saved) ? sanitizeProjects(saved) : [];
  };

  const [projects, setProjects] = useState(() => {
    return loadOwnProjects();
  });
  const [sharedProjects, setSharedProjects] = useState(loadSharedProjects);

  // room은 현재 공유방 상태입니다.
  // 초대코드를 입력하기 전에는 계정별 임시 방을 보고, 입력 후에는 초대코드별 공유방으로 전환됩니다.
  const [room, setRoom] = useState(() => sanitizeRoom(readJson(getShareRoomKey(), fallbackRoom)));

  // activeShareCode가 있으면 getSharedRoomKey(activeShareCode)를 사용합니다.
  // 이 값 덕분에 다른 아이디도 같은 초대코드 방의 참여자/코멘트를 함께 봅니다.
  const [activeShareCode, setActiveShareCode] = useState(room.inviteCode || room.joinedCode || '');
  const [selectedProjectId, setSelectedProjectId] = useState(room.loadedProjectIds[0] || '');
  const [typedMsg, setTypedMsg] = useState('');
  const [isComposingMessage, setIsComposingMessage] = useState(false);
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const chatFeedRef = useRef(null);

  // 공유방 상태가 바뀔 때마다 저장합니다.
  // 같은 값이면 다시 저장하지 않도록 비교해서 이벤트 루프성 갱신을 막습니다.
  useEffect(() => {
    const roomKey = activeShareCode ? getSharedRoomKey(activeShareCode) : getShareRoomKey();
    const nextRoom = {
      ...room,
      inviteCode: activeShareCode || room.inviteCode,
      joinedCode: activeShareCode || room.joinedCode,
    };
    if (JSON.stringify(readJson(roomKey, null)) !== JSON.stringify(nextRoom)) {
      writeJson(roomKey, nextRoom);
    }
  }, [room, activeShareCode]);

  // 프로젝트 목록 또는 현재 공유방 데이터가 다른 곳에서 바뀌면 다시 읽습니다.
  // papermate-storage-updated는 storageKeys.writeJson에서 직접 발생시키는 이벤트입니다.
  useEffect(() => {
    const syncProjects = (event) => {
      const activeRoomKey = activeShareCode ? getSharedRoomKey(activeShareCode) : getShareRoomKey();
      if (event.detail?.key && ![getProjectsKey(), SHARED_PROJECTS_KEY, activeRoomKey].includes(event.detail.key)) return;
      setProjects(loadOwnProjects());
      setSharedProjects(loadSharedProjects());
      if (!event.detail?.key || event.detail.key === activeRoomKey) {
        setRoom(sanitizeRoom(readJson(activeRoomKey, fallbackRoom)));
      }
    };

    window.addEventListener('storage', syncProjects);
    window.addEventListener('papermate-storage-updated', syncProjects);
    return () => {
      window.removeEventListener('storage', syncProjects);
      window.removeEventListener('papermate-storage-updated', syncProjects);
    };
  }, [activeShareCode]);

  // 로그인 계정이 바뀌면 내 프로젝트 목록은 다시 읽습니다.
  // 단, 이미 초대코드 공유방에 들어와 있으면 방 상태는 유지합니다.
  useEffect(() => {
    setProjects(loadOwnProjects());
    setSharedProjects(loadSharedProjects());
    if (!activeShareCode) {
      setRoom(sanitizeRoom(readJson(getShareRoomKey(), fallbackRoom)));
    }
  }, [username, activeShareCode]);

  // 코멘트가 추가되면 채팅창을 맨 아래로 내려 최신 메시지가 바로 보이게 합니다.
  useEffect(() => {
    if (!chatFeedRef.current) return;
    chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
  }, [room.comments]);

  // 불러온 프로젝트 id 순서대로 실제 프로젝트 데이터를 찾아 타임라인에 사용할 목록을 만듭니다.
  const loadedProjects = useMemo(
    () =>
      room.loadedProjectIds
        .map((id) => [...projects, ...sharedProjects].find((project) => project.id === id))
        .filter(Boolean),
    [projects, sharedProjects, room.loadedProjectIds]
  );
  const activeProject = loadedProjects[loadedProjects.length - 1] || [...projects, ...sharedProjects].find((project) => project.id === selectedProjectId);
  const activeInviteCode = activeProject?.inviteCode || '';

  // 여러 프로젝트의 대화 스레드를 하나의 타임라인 배열로 펼칩니다.
  // 마지막으로 불러온 프로젝트의 마지막 항목은 active 상태로 표시합니다.
  const timelineItems = useMemo(
    () =>
      loadedProjects.flatMap((project, projectIndex) =>
        (Array.isArray(project.thread) ? project.thread : []).map((item, itemIndex) => ({
          ...item,
          projectId: project.id,
          projectTitle: project.title,
          active: projectIndex === loadedProjects.length - 1 && itemIndex === project.thread.length - 1,
        }))
      ),
    [loadedProjects]
  );

  // 선택한 프로젝트 id를 공유 본문에 추가합니다.
  // 프로젝트의 inviteCode가 있으면 개인 방이 아니라 초대코드별 공유방에 저장합니다.
  const loadProjectById = (projectId) => {
    if (!projectId) return;
    const project = [...projects, ...sharedProjects].find((candidate) => candidate.id === projectId);
    const nextShareCode = project?.inviteCode || activeShareCode;
    const baseRoom = nextShareCode ? sanitizeRoom(readJson(getSharedRoomKey(nextShareCode), fallbackRoom)) : room;
    if (nextShareCode) setActiveShareCode(nextShareCode);

    setRoom((prev) => {
      const roomSource = nextShareCode ? baseRoom : prev;
      const nextIds = roomSource.loadedProjectIds.includes(projectId)
        ? roomSource.loadedProjectIds
        : [...roomSource.loadedProjectIds, projectId];
      return {
        ...roomSource,
        joinedCode: nextShareCode || roomSource.joinedCode,
        inviteCode: nextShareCode || roomSource.inviteCode,
        loadedProjectIds: nextIds,
      };
    });
    setSelectedProjectId(projectId);
    setIsProjectPickerOpen(false);
  };

  // 프로젝트 불러오기 버튼은 바로 추가하지 않고, 프로젝트 선택창을 먼저 엽니다.
  const openProjectPicker = () => setIsProjectPickerOpen(true);

  // 초대코드를 검증하고, 맞으면 해당 프로젝트와 공유방을 불러옵니다.
  // 참여 인원은 초대코드별 공유방에 저장되므로 다른 아이디에서도 같이 보입니다.
  const joinWithCode = () => {
    const normalizedCode = room.joinedCode.trim();
    const matchedProject = [...projects, ...sharedProjects].find((project) => project.inviteCode === normalizedCode);

    if (matchedProject) {
      const sharedRoom = sanitizeRoom(readJson(getSharedRoomKey(normalizedCode), fallbackRoom));
      setActiveShareCode(normalizedCode);
      setRoom(() => {
        const nextIds = sharedRoom.loadedProjectIds.includes(matchedProject.id)
          ? sharedRoom.loadedProjectIds
          : [...sharedRoom.loadedProjectIds, matchedProject.id];
        const alreadyJoined = sharedRoom.members.some((member) => member.name === username);
        return {
          ...sharedRoom,
          inviteCode: normalizedCode,
          joinedCode: normalizedCode,
          loadedProjectIds: nextIds,
          members: alreadyJoined ? sharedRoom.members : [...sharedRoom.members, { id: Date.now(), name: username }],
        };
      });
      setSelectedProjectId(matchedProject.id);
      setNotice(`참여 완료: "${matchedProject.title}" 프로젝트를 불러왔습니다.`);
      return;
    }

    if (!activeInviteCode || normalizedCode !== activeInviteCode) {
      setNotice('초대코드를 정확히 입력해야 참여 인원에 표시됩니다.');
      return;
    }

    setRoom((prev) => {
      const alreadyJoined = prev.members.some((member) => member.name === username);
      return {
        ...prev,
        inviteCode: activeInviteCode,
        joinedCode: activeInviteCode,
        members: alreadyJoined ? prev.members : [...prev.members, { id: Date.now(), name: username }],
      };
    });
    setNotice('참여 완료: 이제 이 공유방 기록을 계속 볼 수 있습니다.');
  };

  // 코멘트 입력값을 현재 공유방 로그에 추가합니다.
  // room 상태가 바뀌면 위 useEffect가 초대코드별 저장소에 자동 저장합니다.
  const handleSendComment = () => {
    if (!typedMsg.trim()) return;
    setRoom((prev) => ({
      ...prev,
      comments: [
        ...prev.comments,
        {
          id: Date.now(),
          user: username,
          text: typedMsg.trim(),
          time: formatTime(),
        },
      ],
    }));
    setTypedMsg('');
  };

  // 현재 사용자가 작성한 코멘트만 삭제합니다.
  // UI에서도 내 코멘트에만 삭제 버튼을 보여줍니다.
  const handleDeleteComment = (commentId) => {
    setRoom((prev) => ({
      ...prev,
      comments: prev.comments.filter((comment) => comment.id !== commentId || comment.user !== username),
    }));
  };

  // 공유 타임라인에서 분석 페이지로 넘어갈 때 쓰는 콜백입니다.
  // projectId까지 넘기므로 Analysis 페이지에서는 기존 프로젝트에 이어서 저장할 수 있습니다.
  const handleRestore = (item) => {
    if (!onRestoreTrigger) return;
    const project = [...projects, ...sharedProjects].find((candidate) => candidate.id === item.projectId);
    onRestoreTrigger({
      projectId: project?.id || item.projectId,
      q: item.role === 'user' ? item.text : project?.thread?.find((threadItem) => threadItem.role === 'user')?.text || item.title || item.text,
      a: item.role === 'ai' || item.role === 'asset' ? item.text || item.title : project?.thread?.find((threadItem) => threadItem.role === 'ai')?.text || '',
      projectTitle: project?.title || item.projectTitle,
      inviteCode: project?.inviteCode,
      files: project?.files || [],
      thread: project?.thread || [],
    });
  };

  return (
    <Container>
      <MainTimelineContent>
        <TimelineInner>
          <div className="header-area">
            <i className="fa-solid fa-bars menu-toggle"></i>
            <h2>{loadedProjects[loadedProjects.length - 1]?.title || '공유 프로젝트'}</h2>
          </div>

          <ProjectLoadBar>
            <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)} disabled={projects.length === 0}>
              {projects.length === 0 && <option value="">등록된 프로젝트 없음</option>}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
            <button type="button" onClick={openProjectPicker}>
              프로젝트 불러오기
            </button>
            <span className="hint">불러온 순서대로 본문 기록이 쌓입니다.</span>
          </ProjectLoadBar>

          <SectionTitle>분석 비교 대화 타임라인</SectionTitle>
          <TimelineWrapper>
            {timelineItems.length === 0 ? (
              <div className="empty-state">프로젝트를 등록하거나 불러오면 공유 타임라인이 표시됩니다.</div>
            ) : timelineItems.map((item, index) => (
              <TimelineNode key={`${item.projectId}-${item.id}-${index}`} $active={item.active}>
                <div className="dot"></div>
                <div className="card">
                  <div className="project-label">{item.projectTitle}</div>
                  <h4>{item.role === 'asset' ? item.title : item.role === 'user' ? item.text : 'AI 분석 답변'}</h4>
                  <div className="meta">
                    {item.time} {item.role === 'user' ? username : 'AI'}
                  </div>
                  {item.role !== 'user' && <div className="body">{item.text}</div>}
                  {item.rows && (
                    <ResultTable>
                      <thead>
                        <tr>
                          {item.rows[0].map((cell) => (
                            <th key={cell}>{cell}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {item.rows.slice(1).map((row) => (
                          <tr key={row.join('-')}>
                            {row.map((cell) => (
                              <td key={cell}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </ResultTable>
                  )}
                  <div className="actions">
                    <button className="restore-btn" type="button" onClick={() => handleRestore(item)}>
                      <i className="fa-solid fa-turn-up"></i> 이 프로젝트 이어서 작업
                    </button>
                  </div>
                </div>
              </TimelineNode>
            ))}
          </TimelineWrapper>
        </TimelineInner>
      </MainTimelineContent>

      <RightCoopPanel $error={notice.includes('정확히')}>
        <button className="load-btn" type="button" onClick={openProjectPicker}>
          프로젝트 불러오기
        </button>

        <div className="code-row">
          <div className="code-label">초대코드</div>
          <input
            className="code-input"
            value={room.joinedCode}
            placeholder={activeInviteCode || '프로젝트 등록 후 생성'}
            onChange={(event) => setRoom((prev) => ({ ...prev, joinedCode: event.target.value }))}
            onKeyDown={(event) => event.key === 'Enter' && joinWithCode()}
          />
          <button className="join-action" type="button" onClick={joinWithCode}>
            입력
          </button>
        </div>
        <div className="notice">{notice}</div>

        <MembersBox>
          <h5>참여 인원</h5>
          {room.members.length === 0 ? (
            <div className="empty">초대코드 입력 후 표시됩니다.</div>
          ) : (
            room.members.map((member) => (
              <div className="m-item" key={`${member.id}-${member.name}`}>
                <i className="fa-regular fa-circle-user"></i> {member.name}
              </div>
            ))
          )}
        </MembersBox>

        <ChatTimelineFeed ref={chatFeedRef}>
          {room.comments.map((comment) => (
            <TalkBubble key={comment.id} $isMe={comment.user === username}>
              {comment.user !== username && (
                <div className="user-id">
                  <i className="fa-regular fa-circle-user"></i> {comment.user}
                </div>
              )}
              <div className="msg-row">
                <div className="message-actions">
                  <div className="bubble">{comment.text}</div>
                  {comment.user === username && (
                    <button
                      className="delete-btn"
                      type="button"
                      aria-label="내 코멘트 삭제"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="timestamp">{comment.time}</div>
              </div>
            </TalkBubble>
          ))}
        </ChatTimelineFeed>

        <FooterInputBox>
          <input
            type="text"
            placeholder="코멘트 작성"
            value={typedMsg}
            onChange={(event) => setTypedMsg(event.target.value)}
            onCompositionStart={() => setIsComposingMessage(true)}
            onCompositionEnd={() => setIsComposingMessage(false)}
            onKeyDown={(event) => {
              const isComposing = event.nativeEvent.isComposing || isComposingMessage;
              if (event.key === 'Enter' && !isComposing) handleSendComment();
            }}
          />
          <button type="button" onClick={handleSendComment}>
            저장
          </button>
        </FooterInputBox>
      </RightCoopPanel>

      {isProjectPickerOpen && (
        <ProjectPickerOverlay onMouseDown={() => setIsProjectPickerOpen(false)}>
          <ProjectPickerPanel onMouseDown={(event) => event.stopPropagation()}>
            <div className="picker-header">
              <div className="picker-title">
                <h3>프로젝트 선택</h3>
                <div className="picker-desc">프로젝트 창에서 공유할 프로젝트를 선택하면 본문 타임라인에 표시됩니다.</div>
              </div>
              <button className="close-btn" type="button" onClick={() => setIsProjectPickerOpen(false)} aria-label="프로젝트 선택창 닫기">
                ×
              </button>
            </div>

            <ProjectPickerGrid>
              {projects.length === 0 ? (
                <div className="empty-state">등록된 프로젝트가 없습니다.</div>
              ) : projects.map((project) => {
                const isLoaded = room.loadedProjectIds.includes(project.id);
                return (
                  <ProjectPickerCard
                    key={project.id}
                    type="button"
                    $loaded={isLoaded}
                    onClick={() => loadProjectById(project.id)}
                  >
                    <div className="tag-row">
                      <span className="tag">{project.type}</span>
                      {isLoaded && <span className="loaded-label">불러옴</span>}
                    </div>
                    <div className="project-name">{project.title}</div>
                    <div className="updated">최근 수정 {project.updatedAt}</div>
                    <div className="meta">
                      <span>{(project.files || []).length}개 문서</span>
                      <span>{(project.thread || []).length}개 기록</span>
                    </div>
                  </ProjectPickerCard>
                );
              })}
            </ProjectPickerGrid>
          </ProjectPickerPanel>
        </ProjectPickerOverlay>
      )}
    </Container>
  );
}

export default ShareC;
