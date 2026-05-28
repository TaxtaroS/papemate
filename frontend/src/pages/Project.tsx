// TypeScript 변경 표시: JSX가 들어 있는 React 파일이라 .js에서 .tsx로 바꾼 파일입니다.
// TypeScript 변경 표시: 기존 JS 로직은 유지하면서 함수 인자와 화면 props에 실제 타입을 붙여 TypeScript 검사를 통과하게 했습니다.
// 초보자 안내: 사용자가 실제로 보게 되는 한 화면 단위의 React 페이지 컴포넌트입니다.

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
  mergeProjectsIntoSharedIndex,
  readJson,
  SHARED_PROJECTS_KEY,
  upsertProjectByIdOrInvite,
  writeJson,
} from '../utils/storageKeys';
import { projectAPI } from '../services/api';
import { VisualArtifact } from './styles/AnalysisLocal.styles';

const MAX_PROJECTS = 10;
const MAX_VISUALS = 10;
const defaultProjects = [];

const splitMeaningfulLines = (text) =>
  String(text || '')
    .split(/\n+/)
    .map((line) => line.replace(/^[-\d.\s]+/, '').trim())
    .filter((line) => line.length > 8)
    .slice(0, 8);

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

const renderDetailedVisualPreview = (asset: any) => {
  if (asset.kind === 'table') {
    let rows = asset.rows || [];
    
    // 혹시 AI가 문자열 형태로 보냈을 경우를 대비한 방어 코드
    if (typeof rows === 'string') {
      try { rows = JSON.parse(rows); } catch (e) { rows = []; }
    }

    // 표시할 기본 더미 데이터 생성 (AI 데이터가 없을 경우)
    if (!Array.isArray(rows) || rows.length === 0) {
      rows = makeVisualRows(['업로드 문서'], splitMeaningfulLines(asset.text || asset.desc));
    }

    // 💡 핵심: AI가 생성한 모든 객체의 키(Key)를 수집하여 중복 제거 (컬럼명 추출)
    const allKeys = Array.from(new Set(rows.flatMap(Object.keys)));

    return (
      // 컬럼 개수(allKeys.length)에 맞춰 CSS Grid를 동적으로 생성합니다!
      <div className="mini-table" style={{ gridTemplateColumns: `repeat(${allKeys.length}, 1fr)` }}>
        
        {/* 1. 테이블 헤더 (컬럼 이름 렌더링) */}
        {allKeys.map((key: any) => (
          <div className="th" key={`th-${key}`}>
            {key}
          </div>
        ))}
        
        {/* 2. 테이블 본문 데이터 렌더링 */}
        {rows.flatMap((row: any, rIndex: number) =>
          allKeys.map((key: any) => (
            <div key={`td-${rIndex}-${key}`}>
              {row[key] !== undefined && row[key] !== null ? String(row[key]) : '-'}
            </div>
          ))
        )}
      </div>
    );
  }

  // 💡 2. 그래프(Graph) 로직 (그래프는 수치가 필요하므로 최대한 score를 찾거나 임의 생성)
  if (asset.kind === 'graph') {
    const rows = asset.rows?.length ? asset.rows : [{ label: '핵심', score: 70 }, { label: '비교', score: 62 }];
    const points = rows.slice(0, 5).map((row: any, index: number) => {
      const x = 12 + index * (76 / Math.max(1, Math.min(rows.length, 5) - 1));
      const numericScore = typeof row.score === 'number' ? row.score : (parseFloat(row.score) || 50);
      const y = 92 - Math.max(12, Math.min(numericScore, 96)) * 0.78;
      return `${x},${y}`;
    });
    return (
      <div className="mini-graph">
        <svg className="graph-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={points.join(' ')} />
          {points.map((point: string) => {
            const [cx, cy] = point.split(',');
            return <circle key={point} cx={cx} cy={cy} r="2.2" />;
          })}
        </svg>
        <div className="axis y-axis">수치</div>
        <div className="axis x-axis">자료</div>
        {rows.slice(0, 5).map((row: any, i: number) => {
          const label = row.label || row.title || row.name || `항목 ${i+1}`;
          const numericScore = typeof row.score === 'number' ? row.score : (parseFloat(row.score) || 50);
          return (
            <div className="bar-wrap" key={`bar-${label}-${i}`}>
              <div className="bar" style={{ height: `${Math.max(28, Math.min(numericScore, 96))}%` }} />
              <strong>{numericScore}</strong>
              <span>{label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // 💡 3. 마인드맵 로직
  if (asset.kind === 'mindmap') {
    const branches = asset.branches?.length
      ? asset.branches
      : splitMeaningfulLines(asset.text || asset.desc).slice(0, 4);
    return (
      <div className="mini-mindmap">
        <div className="center-node">{asset.title}</div>
        <div className="tree-trunk" aria-hidden="true"></div>
        <div className="branches">
          {branches.slice(0, 5).map((branch: string, index: number) => (
            <span className={`branch branch-${index + 1}`} key={`${branch}-${index}`}>{branch}</span>
          ))}
        </div>
      </div>
    );
  }

  // 💡 4. 이미지(기본) 로직
  return (
    <div className="mini-image">
      <div className="image-title">{asset.desc || asset.title}</div>
      <div className="chips">
        {(asset.keywords || []).slice(0, 6).map((keyword: string) => <span key={keyword}>{keyword}</span>)}
      </div>
    </div>
  );
};

const legacyDummyProjectTitles = [
  '이미지 분류',
  '자연어 처리',
  '논문 분석 처리',
  '딥러닝 이미지 분류 연구 비교',
];

const asArray = (value) => (Array.isArray(value) ? value : []);

const sanitizeProjects = (projects) =>
  asArray(projects).filter((project) => project && !legacyDummyProjectTitles.includes(project.title));

const normalizeProject = (project) => {
  const visuals = asArray(project.visuals).slice(0, MAX_VISUALS);
  return { ...project, visuals, charts: visuals.length };
};

const normalizeProjects = (projects) =>
  sanitizeProjects(projects)
    .slice(0, MAX_PROJECTS)
    .map(normalizeProject);

const mergeProjectLists = (primaryProjects, fallbackProjects) => {
  const merged = [];
  asArray([...asArray(primaryProjects), ...asArray(fallbackProjects)]).forEach((project) => {
    if (!project?.id && !project?.inviteCode) return;
    const exists = merged.some((item) => item.id === project.id || item.inviteCode === project.inviteCode);
    if (!exists) merged.push(project);
  });
  return normalizeProjects(merged);
};

const createInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const loadProjects = () => {
  try {
    const saved = localStorage.getItem(getProjectsKey());
    if (!saved) return defaultProjects;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? normalizeProjects(parsed) : defaultProjects;
  } catch {
    return defaultProjects;
  }
};

const persistProjects = (projects) => {
  const nextProjects = normalizeProjects(projects);
  writeJson(getProjectsKey(), nextProjects);
  mergeProjectsIntoSharedIndex(nextProjects);
  return nextProjects;
};

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
      loadedProjectIds: asArray(savedRoom.loadedProjectIds).filter((id) => id !== projectId),
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

function Projects({ onProjectRestore, onShareProjectOpen }) {
  const [projects, setProjects] = useState(loadProjects);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [selectedVisual, setSelectedVisual] = useState(null);
  const [expandedVisual, setExpandedVisual] = useState(null);
  const [isViewAllOpen, setIsViewAllOpen] = useState(false);
  const [limitNotice, setLimitNotice] = useState('');
  const [syncNotice, setSyncNotice] = useState('');

  const visuals = useMemo(
    () =>
      asArray(projects).flatMap((project) =>
        asArray(project.visuals).map((visual) => ({
          ...visual,
          projectId: project.id,
          projectTitle: visual.projectTitle || project.title,
        }))
      ),
    [projects]
  );

  const visualLimitReached = visuals.length >= MAX_VISUALS;

  const commitProjects = (nextProjects) => {
    const normalizedProjects = persistProjects(nextProjects);
    setProjects(normalizedProjects);
    projectAPI.sync(normalizedProjects).catch((error) => {
      console.warn('MongoDB project sync skipped:', error);
      setSyncNotice('백엔드 동기화에 실패해 브라우저 저장소에 먼저 보관했습니다.');
    });
    return normalizedProjects;
  };

  useEffect(() => {
    let isMounted = true;

    projectAPI.list()
      .then((response) => {
        if (!isMounted) return;
        const serverProjects = response.data?.projects;
        if (!Array.isArray(serverProjects)) return;

        const mergedProjects = mergeProjectLists(serverProjects, loadProjects());
        persistProjects(mergedProjects);
        setProjects(mergedProjects);
        setSyncNotice('');
      })
      .catch((error) => {
        console.warn('MongoDB project load skipped:', error);
        if (isMounted) setSyncNotice('백엔드 프로젝트 목록을 불러오지 못해 브라우저 저장소 기준으로 표시합니다.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    writeJson(getProjectsKey(), normalizeProjects(projects));
    mergeProjectsIntoSharedIndex(projects);
  }, [projects]);

  useEffect(() => {
    const syncProjects = (event) => {
      if (event.detail?.key && event.detail.key !== getProjectsKey()) return;
      const nextProjects = loadProjects();
      setProjects((prev) => (
        JSON.stringify(normalizeProjects(prev)) === JSON.stringify(nextProjects) ? prev : nextProjects
      ));
    };

    window.addEventListener('storage', syncProjects);
    window.addEventListener('papermate-storage-updated', syncProjects);
    return () => {
      window.removeEventListener('storage', syncProjects);
      window.removeEventListener('papermate-storage-updated', syncProjects);
    };
  }, []);

  const handleAddProject = (event) => {
    event.preventDefault();
    const currentProjects = asArray(projects);
    if (currentProjects.length >= MAX_PROJECTS) {
      const message = '프로젝트는 최대 10개까지만 만들 수 있습니다. 새 프로젝트를 추가하려면 기존 프로젝트를 삭제해주세요.';
      setLimitNotice(message);
      window.alert(message);
      return;
    }

    const today = new Date().toLocaleDateString('ko-KR').replace(/. /g, '.').slice(0, -1);
    commitProjects([
      ...currentProjects,
      {
        id: `project-${Date.now()}`,
        type: 'New',
        title: `새 프로젝트 ${currentProjects.length + 1}`,
        updatedAt: today,
        date: today,
        charts: 0,
        isHwp: false,
        inviteCode: createInviteCode(),
        files: [],
        thread: [],
        visuals: [],
      },
    ]);
    setLimitNotice('');
  };

  const handleDeleteProject = (event, project) => {
    event.preventDefault();
    event.stopPropagation();
    if (!window.confirm(`"${project.title}" 프로젝트를 삭제하시겠습니까?`)) return;

    deleteProjectEverywhere(project.id);
    commitProjects(asArray(projects).filter((item) => item.id !== project.id));
    projectAPI.delete(project.id).catch((error) => {
      console.warn('MongoDB project delete skipped:', error);
      setSyncNotice('백엔드 삭제 반영에 실패해 브라우저 저장소에서 먼저 삭제했습니다.');
    });
    if (editingProjectId === project.id) setEditingProjectId(null);
    setLimitNotice('');
  };

  const handleEditClick = (event, project) => {
    event.preventDefault();
    event.stopPropagation();
    setEditingProjectId(project.id);
    setEditTitle(project.title);
  };

  const handleTitleSave = () => {
    if (!editTitle.trim()) return;
    const today = new Date().toLocaleDateString('ko-KR').replace(/. /g, '.').slice(0, -1);
    commitProjects(
      asArray(projects).map((project) =>
        project.id === editingProjectId ? { ...project, title: editTitle.trim(), updatedAt: today, date: today } : project
      )
    );
    setEditingProjectId(null);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') handleTitleSave();
    else if (event.key === 'Escape') setEditingProjectId(null);
  };

  const handleProjectRestore = (project) => {
    if (project.source === 'shared-discussion') {
      onShareProjectOpen?.({
        projectId: project.id,
        projectTitle: project.title,
        inviteCode: project.inviteCode,
      });
      return;
    }

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
      files: asArray(project.files),
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

  const handleDeleteVisual = (event, id) => {
    event.preventDefault();
    event.stopPropagation();
    if (!window.confirm('이 시각화 데이터를 삭제하시겠습니까?')) return;

    commitProjects(
      asArray(projects).map((project) => {
        const nextVisuals = asArray(project.visuals).filter((visual) => visual.id !== id);
        return { ...project, visuals: nextVisuals, charts: nextVisuals.length };
      })
    );
    if (selectedVisual && selectedVisual.id === id) setSelectedVisual(null);
    setLimitNotice('');
  };

  const renderVisualPreview = (visual, isDrawer = false) => {
    // 메인 그리드 카드의 넓은 가로 비율(약 4:1)에 맞추기 위해 렌더링 영역의 가로폭을 크게 설정합니다.
    const containerWidth = isDrawer ? 350 : 400;
    const containerHeight = isDrawer ? 180 : 80;

    const width = isDrawer ? 600 : 1000;
    const height = isDrawer ? 300 : 250;
    
    // 칸에 맞게 꽉 채우기 위한 스케일 계산
    const scale = Math.max(containerWidth / width, containerHeight / height);

    return (
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        boxSizing: 'border-box',
        padding: '16px'
      }}>
        <VisualArtifact style={{ border: 'none', boxShadow: 'none', margin: 0, padding: 0, width: '100%', height: '100%' }}>
          <div className="artifact-body" style={{ padding: 0, height: '100%' }}>
            {renderDetailedVisualPreview(visual)}
          </div>
        </VisualArtifact>
      </div>
    );
  };

  return (
    <ProjectsContainer>
      <HeaderSection><h2>내 프로젝트</h2></HeaderSection>

      {limitNotice && (
        <div style={{ margin: '0 0 18px 0', color: '#dc2626', fontSize: '13px', fontWeight: 700 }}>
          {limitNotice}
        </div>
      )}
      {syncNotice && (
        <div style={{ margin: '0 0 18px 0', color: '#64748b', fontSize: '13px', fontWeight: 700 }}>
          {syncNotice}
        </div>
      )}

      <VisualSection>
        <SectionTitleRow>
          <h3>
            저장된 시각화 보관함
            <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600', marginLeft: '6px' }}>
              ({Math.min(visuals.length, MAX_VISUALS)}/{MAX_VISUALS})
            </span>
          </h3>
          <div className="btn-group">
            <button type="button" className="sub-btn" onClick={() => setIsViewAllOpen(true)}>전체 보기</button>
          </div>
        </SectionTitleRow>

        {visualLimitReached && (
          <div style={{ margin: '-8px 0 16px 0', color: '#64748b', fontSize: '12.5px', fontWeight: 700 }}>
            시각화 보관함은 최대 10개까지 저장됩니다. 새 시각화를 저장하려면 기존 항목을 삭제해주세요.
          </div>
        )}

        <VisualBoxContainer>
          {visuals.length === 0 ? (
            <EmptyCard as="div"><span>저장된 시각화가 없습니다.</span></EmptyCard>
          ) : visuals.slice(0, 3).map((visual) => (
            <VisualCard key={visual.id} onClick={() => setSelectedVisual(visual)}>
              <button className="delete-visual-btn" onClick={(event) => handleDeleteVisual(event, visual.id)} title="삭제">
                <i className="fa-solid fa-trash"></i>
              </button>
              <div className="mock-img">{renderVisualPreview(visual)}</div>
              <h4>{visual.title}</h4>
              <span>{visual.projectTitle} · {visual.date}</span>
            </VisualCard>
          ))}
        </VisualBoxContainer>
      </VisualSection>

      <SectionTitleRow>
        <h3>
          진행 중인 프로젝트
          <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600', marginLeft: '8px' }}>
            ({asArray(projects).length}/{MAX_PROJECTS})
          </span>
        </h3>
        <button type="button" className="primary-btn" onClick={handleAddProject}>+ 새 프로젝트...</button>
      </SectionTitleRow>

      <ProjectGrid>
        {asArray(projects).length === 0 ? (
          <EmptyCard onClick={handleAddProject}>
            <span className="plus-icon">+</span>
            <span>새 프로젝트 추가</span>
          </EmptyCard>
        ) : asArray(projects).map((project) => (
          <ProjectCard
            key={project.id}
            $shared={project.source === 'shared-discussion'}
            onClick={() => handleProjectRestore(project)}
          >
            <div className={`tag ${project.isHwp ? 'hwp' : ''} ${project.source === 'shared-discussion' ? 'shared' : ''}`}>
              {project.type || (project.source === 'shared-discussion' ? 'Shared' : 'New')}
            </div>
            {editingProjectId === project.id ? (
              <input
                type="text"
                className="title-input"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleKeyDown}
                autoFocus
                onClick={(event) => event.stopPropagation()}
              />
            ) : (
              <h3>{project.title}</h3>
            )}
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
              <div className="meta-info">
                <span><i className="fa-solid fa-user"></i> {project.source === 'shared-discussion' ? '공유' : '개인'}</span>
                {(project.charts || 0) > 0 && (
                  <span><i className="fa-solid fa-box-archive"></i> 차트 {project.charts}개</span>
                )}
              </div>
              <div className="action-btns">
                <button type="button" className="edit-icon-btn" onClick={(event) => handleEditClick(event, project)} title="프로젝트명 수정">
                  <i className="fa-solid fa-pen"></i>
                </button>
                <button type="button" className="delete-icon-btn" onClick={(event) => handleDeleteProject(event, project)} title="프로젝트 삭제">
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          </ProjectCard>
        ))}
        {asArray(projects).length > 0 && asArray(projects).length < MAX_PROJECTS && (
          <EmptyCard onClick={handleAddProject}>
            <span className="plus-icon">+</span>
            <span>새 프로젝트 추가</span>
          </EmptyCard>
        )}
      </ProjectGrid>

      {isViewAllOpen && (
        <ModalOverlay onClick={() => setIsViewAllOpen(false)}>
          <ModalContent onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>모든 시각화 보관함 ({Math.min(visuals.length, MAX_VISUALS)}/{MAX_VISUALS})</h3>
              <button type="button" onClick={() => setIsViewAllOpen(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="modal-body">
              {visuals.length === 0 ? (
                <EmptyCard as="div"><span>저장된 시각화가 없습니다.</span></EmptyCard>
              ) : visuals.map((visual) => (
                <VisualCard key={visual.id} onClick={() => setSelectedVisual(visual)}>
                  <button className="delete-visual-btn" onClick={(event) => handleDeleteVisual(event, visual.id)} title="삭제">
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

      <DrawerBackdrop $show={!!selectedVisual} onClick={() => setSelectedVisual(null)} />
      <DrawerContainer $show={!!selectedVisual}>
        {selectedVisual && (
          <>
            <div className="drawer-header">
              <div className="title-wrap">
                <h3>{selectedVisual.title}</h3>
                <span>{selectedVisual.projectTitle} · 저장 일자: {selectedVisual.date}</span>
              </div>
              <button type="button" className="close-btn" onClick={() => setSelectedVisual(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="drawer-body">
              <div 
                className="visual-preview" 
                onClick={() => setExpandedVisual(selectedVisual)}
                style={{ cursor: 'pointer', position: 'relative' }}
                title="클릭하여 크게 보기"
              >
                {renderVisualPreview(selectedVisual, true)}
                <div style={{ position: 'absolute', right: '12px', bottom: '12px', background: 'rgba(255,255,255,0.8)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <i className="fa-solid fa-expand" style={{ color: '#0ea5a4' }}></i>
                </div>
              </div>
              <div className="info-section"><h5>데이터 분석 요약</h5><p>{selectedVisual.desc}</p></div>
              <div className="info-section">
                <h5>세부 정보 필드</h5>
                <div className="details-list">
                  {asArray(selectedVisual.details).map((item, index) => (
                    <div className="detail-item" key={index}>
                      <span className="lbl">{item.lbl}</span>
                      <span className="val">{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="drawer-footer">
              <button type="button" className="action-btn">보고서 데이터 다운로드 (PNG)</button>
            </div>
          </>
        )}
      </DrawerContainer>

      {expandedVisual && (
        <ModalOverlay onClick={() => setExpandedVisual(null)} style={{ zIndex: 1100 }}>
          <ModalContent onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px', width: '90%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '20px' }}>{expandedVisual.title}</h3>
              </div>
              <button type="button" onClick={() => setExpandedVisual(null)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', padding: '0' }}>
              <div style={{ width: '100%', minHeight: '400px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', boxSizing: 'border-box' }}>
                <VisualArtifact style={{ width: '100%', border: 'none', boxShadow: 'none', margin: 0, padding: 0 }}>
                  <div className="artifact-body" style={{ padding: 0 }}>
                    {renderDetailedVisualPreview(expandedVisual)}
                  </div>
                </VisualArtifact>
              </div>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}
    </ProjectsContainer>
  );
}

export default Projects;
