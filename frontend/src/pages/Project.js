import React, { useEffect, useMemo, useState } from 'react';
import {
  ProjectsContainer,
  HeaderSection,
  SectionTitleRow,
  VisualSection,
  VisualBoxContainer,
  VisualCard,
  ProjectGrid,
  ProjectCard,
  EmptyCard,
  ModalOverlay,
  ModalContent,
  DrawerBackdrop,
  DrawerContainer
} from './styles/Project.styles';
import {
  getProjectsKey,
  getRecentConversationsKey,
  getSharedRoomKey,
  getShareRoomKey,
  readJson,
  SHARED_PROJECTS_KEY,
  writeJson,
} from '../utils/storageKeys';

// Project 페이지에서 쓰는 주요 라이브러리/기능
// - React Hooks: useState로 프로젝트/모달 상태 관리, useMemo로 시각화 목록 계산
// - styled-components: ./styles/Project.styles.js에서 카드/모달/드로어 UI를 관리
// - localStorage 유틸: 계정별 프로젝트와 초대코드 공유 인덱스를 저장

const defaultProjects = [];

const legacyDummyProjectTitles = [
  '이미지 분류',
  '자연어 처리',
  '논문 분석 처리',
  '딥러닝 이미지 분류 연구 비교',
];

const sanitizeProjects = (projects) =>
  projects.filter((project) => !legacyDummyProjectTitles.includes(project.title));

// 수동으로 새 프로젝트를 만들 때도 초대코드가 있어야 공유 페이지에서 바로 참여할 수 있습니다.
const createInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// 현재 로그인 계정의 프로젝트 목록을 localStorage에서 읽습니다.
// 저장값이 없거나 깨져 있으면 빈 배열로 시작합니다.
const loadProjects = () => {
  try {
    const saved = localStorage.getItem(getProjectsKey());
    if (!saved) return defaultProjects;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? sanitizeProjects(parsed) : defaultProjects;
  } catch {
    return defaultProjects;
  }
};

// 프로젝트 삭제 시 한 곳만 지우면 화면마다 찌꺼기가 남습니다.
// 그래서 프로젝트 목록, 최근대화, 공유 타임라인, 초대코드 인덱스를 함께 정리합니다.
const deleteProjectEverywhere = (projectId) => {
  const projectsKey = getProjectsKey();
  const recentConversationsKey = getRecentConversationsKey();
  const shareRoomKey = getShareRoomKey();
  const savedProjects = readJson(projectsKey, []);
  const deletedProject = Array.isArray(savedProjects) ? savedProjects.find((project) => project.id === projectId) : null;
  if (Array.isArray(savedProjects)) {
    writeJson(projectsKey, savedProjects.filter((project) => project.id !== projectId));
  }

  const sharedProjects = readJson(SHARED_PROJECTS_KEY, []);
  if (Array.isArray(sharedProjects)) {
    writeJson(
      SHARED_PROJECTS_KEY,
      sharedProjects.filter((project) => project.id !== projectId && project.inviteCode !== deletedProject?.inviteCode)
    );
  }

  const savedRecents = readJson(recentConversationsKey, []);
  if (Array.isArray(savedRecents)) {
    writeJson(
      recentConversationsKey,
      savedRecents.filter((item) => item.projectId !== projectId && item.id !== projectId)
    );
  }

  const savedRoom = readJson(shareRoomKey, null);
  if (savedRoom) {
    writeJson(shareRoomKey, {
      ...savedRoom,
      loadedProjectIds: (savedRoom.loadedProjectIds || []).filter((id) => id !== projectId),
      comments: savedRoom.comments || [],
      members: savedRoom.members || [],
    });
  }

  if (deletedProject?.inviteCode) {
    writeJson(getSharedRoomKey(deletedProject.inviteCode), {
      inviteCode: deletedProject.inviteCode,
      joinedCode: deletedProject.inviteCode,
      loadedProjectIds: [],
      comments: [],
      members: [],
    });
  }
};

// 초대코드 복사용 브라우저 클립보드 helper입니다.
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


/* ==========================================================================
   🎨 1. 공통 및 메인 레이아웃 스타일
   ========================================================================== */



/* ==========================================================================
   🎨 2. 시각화 보관함 및 프로젝트 카드 스타일
   ========================================================================== */



/* ==========================================================================
   🎨 3. 전체보기 모달 (View All Modal) 스타일
   ========================================================================== */

/* ==========================================================================
   🎨 4. 사이드 드로어 (Side Drawer) 스타일
   ========================================================================== */

/* ==========================================================================
   📦 메인 컴포넌트 로직
   ========================================================================== */
function Projects({ onProjectRestore }) {
  // 프로젝트 상태: Analysis 페이지에서 등록한 프로젝트도 같은 저장소에서 불러옵니다.
  const [projects, setProjects] = useState(loadProjects);

  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  
  const [selectedVisual, setSelectedVisual] = useState(null);
  const [isViewAllOpen, setIsViewAllOpen] = useState(false);

  // 시각화 보관함은 별도 저장소가 아니라 각 project.visuals를 모아서 보여줍니다.
  // 이렇게 해야 "이미지는 같은 프로젝트명으로 저장"되는 구조가 됩니다.
  const visuals = useMemo(
    () =>
      projects.flatMap((project) =>
        (project.visuals || []).map((visual) => ({
          ...visual,
          projectId: project.id,
          projectTitle: visual.projectTitle || project.title,
        }))
      ),
    [projects]
  );

  // projects 상태가 바뀔 때마다 계정별 프로젝트 저장소에 반영합니다.
  // 동시에 초대코드 입력으로 찾을 수 있도록 sharedProjects 인덱스도 갱신합니다.
  useEffect(() => {
    localStorage.setItem(getProjectsKey(), JSON.stringify(projects));

    const sharedProjects = readJson(SHARED_PROJECTS_KEY, []);
    const ownProjectsWithInvite = projects.filter((project) => project.inviteCode);
    if (ownProjectsWithInvite.length === 0) return;

    const ownIds = new Set(ownProjectsWithInvite.map((project) => project.id));
    const ownInviteCodes = new Set(ownProjectsWithInvite.map((project) => project.inviteCode));
    const otherSharedProjects = Array.isArray(sharedProjects)
      ? sharedProjects.filter((project) => !ownIds.has(project.id) && !ownInviteCodes.has(project.inviteCode))
      : [];

    writeJson(SHARED_PROJECTS_KEY, [...ownProjectsWithInvite, ...otherSharedProjects].slice(0, 100));
  }, [projects]);

  // 다른 페이지에서 프로젝트를 저장/삭제하면 CustomEvent로 알려주므로,
  // 프로젝트 페이지가 열려 있는 상태에서도 목록을 즉시 새로 읽습니다.
  useEffect(() => {
    const syncProjects = (event) => {
      if (event.detail?.key && event.detail.key !== getProjectsKey()) return;
      setProjects(loadProjects());
    };

    window.addEventListener('storage', syncProjects);
    window.addEventListener('papermate-storage-updated', syncProjects);
    return () => {
      window.removeEventListener('storage', syncProjects);
      window.removeEventListener('papermate-storage-updated', syncProjects);
    };
  }, []);

  /* --- 프로젝트 핸들러 --- */
  // 새 프로젝트는 아직 문서/대화가 없는 빈 작업 공간입니다.
  // 이후 프로젝트 카드를 누르면 분석 페이지에서 이어서 작업할 수 있습니다.
  const handleAddProject = (e) => {
    e.preventDefault();
    if (projects.length >= 10) { alert("프로젝트는 최대 10개까지 생성 가능합니다."); return; }
    const today = new Date().toLocaleDateString('ko-KR').replace(/. /g, '.').slice(0, -1);
    setProjects([...projects, {
      id: `project-${Date.now()}`,
      type: 'New',
      title: `새 프로젝트 ${projects.length + 1}`,
      updatedAt: today,
      date: today,
      charts: 0,
      isHwp: false,
      inviteCode: createInviteCode(),
      files: [],
      thread: [],
      visuals: [],
    }]);
  };

  // 삭제는 되돌릴 수 없는 작업이라 두 번 확인합니다.
  const handleDeleteProject = (e, project) => {
    e.preventDefault(); e.stopPropagation();
    const firstConfirm = window.confirm(`"${project.title}" 프로젝트를 정말 삭제하시겠습니까?`);
    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      '삭제하면 이 프로젝트의 저장 문서, 파일 목록, 분석 대화, 공유 타임라인 연결, 최근대화 기록이 모두 영구 삭제됩니다. 계속 진행할까요?'
    );
    if (!secondConfirm) return;

    deleteProjectEverywhere(project.id);
    setProjects((prev) => prev.filter((item) => item.id !== project.id));
    if (editingProjectId === project.id) setEditingProjectId(null);
    window.alert('프로젝트가 영구 삭제되었습니다. 저장된 문서, 파일 목록, 분석 기록, 최근대화 목록에서도 삭제되었습니다.');
  };

  const handleEditClick = (e, project) => { e.preventDefault(); e.stopPropagation(); setEditingProjectId(project.id); setEditTitle(project.title); };
  const handleTitleSave = () => { if (!editTitle.trim()) return; const today = new Date().toLocaleDateString('ko-KR').replace(/. /g, '.').slice(0, -1); setProjects(projects.map(p => p.id === editingProjectId ? { ...p, title: editTitle.trim(), updatedAt: today, date: today } : p)); setEditingProjectId(null); };
  const handleKeyDown = (e) => { if (e.key === 'Enter') handleTitleSave(); else if (e.key === 'Escape') setEditingProjectId(null); };
  // 프로젝트 카드를 클릭하면 복원이 아니라 "이어서 작업" 데이터로 Analysis 페이지에 넘깁니다.
  const handleProjectRestore = (project) => {
    if (!onProjectRestore) return;
    const thread = Array.isArray(project.thread) ? project.thread : [];
    const lastUserMessage = [...thread].reverse().find((item) => item.role === 'user');
    const lastAiMessage = [...thread].reverse().find((item) => item.role === 'ai' || item.role === 'asset');

    onProjectRestore({
      projectId: project.id,
      q: lastUserMessage?.text || project.title,
      a: lastAiMessage?.text || '저장된 프로젝트를 이어서 작업합니다.',
      projectTitle: project.title,
      inviteCode: project.inviteCode,
      files: project.files || [],
      thread,
    });
  };
  const handleInviteCopy = (event, inviteCode) => {
    event.preventDefault();
    event.stopPropagation();
    if (!inviteCode) {
      window.alert('복사할 초대코드가 없습니다.');
      return;
    }
    copyText(inviteCode);
  };

  // 시각화 항목 삭제는 프로젝트 자체를 삭제하지 않고 project.visuals 안의 항목만 제거합니다.
  const handleDeleteVisual = (e, id) => {
    e.preventDefault(); 
    e.stopPropagation(); // 카드 전체 클릭(사이드 드로어 열림) 이벤트 방지
    if(window.confirm("이 시각화 데이터를 삭제하시겠습니까?")) {
      setProjects((prev) =>
        prev.map((project) => {
          const nextVisuals = (project.visuals || []).filter((visual) => visual.id !== id);
          return { ...project, visuals: nextVisuals, charts: nextVisuals.length };
        })
      );
      // 만약 현재 삭제하는 카드의 드로어가 열려있다면 같이 닫아줌
      if (selectedVisual && selectedVisual.id === id) {
        setSelectedVisual(null);
      }
    }
  };

  // 실제 차트 라이브러리 도입 전 단계의 미리보기 렌더러입니다.
  // kind 값(table/chart/graph)에 따라 다른 형태의 CSS 미니 시각화를 보여줍니다.
  const renderVisualPreview = (visual) => {
    if (visual.kind === 'table') {
      return (
        <div className="mini-visual table">
          <span></span><span></span><span></span>
          <span></span><span></span><span></span>
          <span></span><span></span><span></span>
        </div>
      );
    }

    if (visual.kind === 'graph') {
      return (
        <div className="mini-visual graph">
          <i></i><i></i><i></i><i></i>
        </div>
      );
    }

    return (
      <div className="mini-visual chart">
        <span style={{ height: '34%' }}></span>
        <span style={{ height: '68%' }}></span>
        <span style={{ height: '48%' }}></span>
        <span style={{ height: '82%' }}></span>
      </div>
    );
  };

  return (
    <ProjectsContainer>
      <HeaderSection><h2>내 프로젝트</h2></HeaderSection>

      {/* 1. 시각화 보관함 영역 (메인 화면) */}
      <VisualSection>
        <SectionTitleRow>
          {/* 💡 제목 옆에 10개 제한 카운터 표시 */}
          <h3>저장된 시각화 보관함 <span style={{fontSize: '14px', color: '#94a3b8', fontWeight: '600', marginLeft: '6px'}}>({visuals.length}/10)</span></h3>
          <div className="btn-group">
            
            <button type="button" className="sub-btn" onClick={() => setIsViewAllOpen(true)}>전체 보기</button>
          </div>
        </SectionTitleRow>
        
        <VisualBoxContainer>
          {visuals.length === 0 ? (
            <EmptyCard as="div"><span>저장된 시각화가 없습니다.</span></EmptyCard>
          ) : visuals.slice(0, 3).map((visual) => (
            <VisualCard key={visual.id} onClick={() => setSelectedVisual(visual)}>
              {/* 💡 카드 우측 상단 삭제 버튼 배치 */}
              <button className="delete-visual-btn" onClick={(e) => handleDeleteVisual(e, visual.id)} title="시각화 데이터 삭제">
                <i className="fa-solid fa-trash"></i>
              </button>
              
              <div className="mock-img">{renderVisualPreview(visual)}</div>
              <h4>{visual.title}</h4>
              <span>{visual.projectTitle} · {visual.date}</span>
            </VisualCard>
          ))}
        </VisualBoxContainer>
      </VisualSection>

      {/* 2. 진행 중인 프로젝트 영역 */}
      <SectionTitleRow>
        <h3>진행 중인 프로젝트 <span style={{fontSize: '14px', color: '#94a3b8', fontWeight: '600', marginLeft: '8px'}}>({projects.length}/10)</span></h3>
        <button type="button" className="primary-btn" onClick={handleAddProject}>+ 새 프로젝트...</button>
      </SectionTitleRow>
      <ProjectGrid>
        {projects.length === 0 ? (
          <EmptyCard onClick={handleAddProject}><span className="plus-icon">+</span><span>새 프로젝트 추가</span></EmptyCard>
        ) : projects.map((project) => (
          <ProjectCard key={project.id} onClick={() => handleProjectRestore(project)}>
            <div className={`tag ${project.isHwp ? 'hwp' : ''}`}>{project.type || 'New'}</div>
            {editingProjectId === project.id ? (
              <input type="text" className="title-input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onBlur={handleTitleSave} onKeyDown={handleKeyDown} autoFocus onClick={(e) => e.stopPropagation()} />
            ) : ( <h3>{project.title}</h3> )}
            <div className="date">최근 수정 {project.date || project.updatedAt}</div>
            <button
              type="button"
              className="invite-code"
              title="클릭하면 초대코드가 복사됩니다"
              onClick={(event) => handleInviteCopy(event, project.inviteCode)}
            >
              <span>초대코드</span>
              <strong>{project.inviteCode || '없음'}</strong>
            </button>
            <div className="profile-thumbnail"><i className="fa-regular fa-circle-user"></i></div>
            <div className="card-footer">
              <div className="meta-info"><span><i className="fa-solid fa-user"></i> 개인</span> {(project.charts || 0) > 0 && ( <span><i className="fa-solid fa-box-archive"></i> 차트 {project.charts}개</span> )}</div>
              <div className="action-btns">
                <button type="button" className="edit-icon-btn" onClick={(e) => handleEditClick(e, project)}><i className="fa-solid fa-pen"></i></button>
                <button type="button" className="delete-icon-btn" onClick={(e) => handleDeleteProject(e, project)}><i className="fa-solid fa-trash"></i></button>
              </div>
            </div>
          </ProjectCard>
        ))}
        {projects.length > 0 && projects.length < 10 && ( <EmptyCard onClick={handleAddProject}><span className="plus-icon">+</span><span>새 프로젝트 추가</span></EmptyCard> )}
      </ProjectGrid>

      {/* ==========================================================================
         🔓 3. 전체보기 모달 레이아웃 (이 안에서도 삭제 가능)
         ========================================================================== */}
      {isViewAllOpen && (
        <ModalOverlay onClick={() => setIsViewAllOpen(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>모든 시각화 보관함 ({visuals.length}/10)</h3>
              <button onClick={() => setIsViewAllOpen(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="modal-body">
              {visuals.length === 0 ? (
                <EmptyCard as="div"><span>저장된 시각화가 없습니다.</span></EmptyCard>
              ) : visuals.map((visual) => (
                <VisualCard key={visual.id} onClick={() => setSelectedVisual(visual)}>
                  {/* 💡 전체보기 모달 안에서도 삭제 기능 활성화 */}
                  <button className="delete-visual-btn" onClick={(e) => handleDeleteVisual(e, visual.id)}>
                    <i className="fa-solid fa-trash"></i>
                  </button>
                  <div className="mock-img">{renderVisualPreview(visual)}</div>
                  <h4>{visual.title}</h4>
                  <span>{visual.projectTitle} · {visual.date}</span>
                </VisualCard>
              ))}
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* ==========================================================================
         🔓 4. 사이드 드로어
         ========================================================================== */}
      <DrawerBackdrop $show={!!selectedVisual} onClick={() => setSelectedVisual(null)} />
      <DrawerContainer $show={!!selectedVisual}>
        {selectedVisual && (
          <>
            <div className="drawer-header">
              <div className="title-wrap"><h3>{selectedVisual.title}</h3><span>{selectedVisual.projectTitle} · 저장 일자: {selectedVisual.date}</span></div>
              <button type="button" className="close-btn" onClick={() => setSelectedVisual(null)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="drawer-body">
              <div className="visual-preview">{renderVisualPreview(selectedVisual)}</div>
              <div className="info-section"><h5>데이터 분석 요약</h5><p>{selectedVisual.desc}</p></div>
              <div className="info-section">
                <h5>세부 정보 필드</h5>
                <div className="details-list">
                  {(selectedVisual.details || []).map((item, idx) => (
                    <div className="detail-item" key={idx}><span className="lbl">{item.lbl}</span><span className="val">{item.val}</span></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="drawer-footer">
              {/* 💡 하단에 드로어 안에서도 해당 데이터 삭제할 수 있는 기능 연결 시도 가능 (현재는 다운로드 버튼) */}
              <button type="button" className="action-btn">보고서 데이터 다운로드 (PNG)</button>
            </div>
          </>
        )}
      </DrawerContainer>

    </ProjectsContainer>
  );
}

export default Projects;
