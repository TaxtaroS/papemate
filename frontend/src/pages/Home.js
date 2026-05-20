import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { RiRobot2Line } from 'react-icons/ri';
import { FiChevronRight } from 'react-icons/fi';

/* ── 💡 외부로 분리한 AuthModal 컴포넌트 임포트 ── */
import AuthModal from '../components/AuthModal';

/* ── 서브 메뉴 페이지 컴포넌트 임포트 ── */
import MypageC from './Mypage';       
import ShareC from './Share';         
import AnalysisC from './Analysis'; 
import Project from './Project';

/* ── 인증 상태 관리 ── */
import { useAuth } from '../context/AuthContext';
import {
  Container,
  SidebarSlot,
  SidebarOpenButton,
  MainContent,
  TopAuth,
  MainDashboard,
  DashboardBrand,
  GridContainer,
  FeatureCard,
} from './styles/Home.styles';
import { getProjectsKey, getRecentConversationsKey, readJson } from '../utils/storageKeys';

function Home() {
  const loadRecentConversations = () => {
    const parsed = readJson(getRecentConversationsKey(), []);
    return Array.isArray(parsed) ? parsed : [];
  };

  const { isLoggedIn, user, logout, login, signup } = useAuth();
  const [viewMode, setViewMode] = useState('main'); 
  const [restoredData, setRestoredData] = useState(null);
  const [recentConversations, setRecentConversations] = useState(loadRecentConversations);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [formData, setFormData] = useState({ id: '', pw: '', confirmPw: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  
  /* ── 분리된 AuthModal을 하나로 제어하기 위한 단일 상태 관리 모드 ── */
  const [modalMode, setModalMode] = useState(null); // 'recommend', 'login', 'signup', null

  useEffect(() => {
    const syncRecents = (event) => {
      if (event.detail?.key && event.detail.key !== getRecentConversationsKey()) return;
      setRecentConversations(loadRecentConversations());
    };

    window.addEventListener('storage', syncRecents);
    window.addEventListener('papermate-storage-updated', syncRecents);
    return () => {
      window.removeEventListener('storage', syncRecents);
      window.removeEventListener('papermate-storage-updated', syncRecents);
    };
  }, []);

  useEffect(() => {
    setRecentConversations(loadRecentConversations());
    setRestoredData(null);
    setViewMode('main');
  }, [user?.id, user?.username]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setAuthError('');
  };

  const handleMenuRouting = (menuName) => {
    const protectedMenus = ['공유', '분석 비교', '내 프로젝트', '마이페이지', '프로필클릭'];
    
    if (!isLoggedIn && protectedMenus.includes(menuName)) {
      setModalMode('recommend'); /* 비로그인 시 로그인 권유 모달 표시 */
      return;
    }

    if (menuName === '공유') setViewMode('공유');
    else if (menuName === '분석 비교') setViewMode('분석 비교');
    else if (menuName === '내 프로젝트') setViewMode('내 프로젝트');
    else if (menuName === '마이페이지' || menuName === '프로필클릭') setViewMode('마이페이지');
    else if (menuName === '새 채팅') { setViewMode('분석 비교'); setRestoredData(null); }
  };

  const openLoginPopup = () => {
    setAuthError('');
    setModalMode('login');
  };
  const openSignupPopup = () => {
    setAuthError('');
    setModalMode('signup');
  };

  const submitAuthRequest = async (mode) => {
    const usernameInput = formData.id.trim();
    const passwordInput = formData.pw;

    if (!usernameInput || !passwordInput) {
      setAuthError('아이디와 비밀번호를 입력해주세요.');
      return;
    }

    if (mode === 'signup' && passwordInput !== formData.confirmPw) {
      setAuthError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    try {
      if (mode === 'login') {
        await login(usernameInput, passwordInput);
      } else {
        await signup(usernameInput, passwordInput);
      }
      setModalMode(null);
      setFormData({ id: '', pw: '', confirmPw: '' });
      setAuthError('');
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message || '서버와 연결할 수 없습니다.';
      setAuthError(errorMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAbsoluteLogout = () => {
    logout();
    setViewMode('main'); 
  };

  const handleTimelineRestoreJump = (historyData) => {
    if (!isLoggedIn) {
      setModalMode('recommend');
      return;
    }
    setRestoredData(historyData);
    setViewMode('분석 비교');
  };

  const handleProjectRestoreJump = (projectData) => {
    if (!isLoggedIn) {
      setModalMode('recommend');
      return;
    }
    setRestoredData(projectData);
    setViewMode('분석 비교');
  };

  const handleRecentConversationClick = (conversation) => {
    const loadProjects = () => {
      try {
        const parsed = readJson(getProjectsKey(), []);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    const project = loadProjects().find((item) => item.id === conversation.projectId || item.id === conversation.id);
    const thread = Array.isArray(project?.thread) ? project.thread : [];
    const lastUserMessage = [...thread].reverse().find((item) => item.role === 'user');
    const lastAiMessage = [...thread].reverse().find((item) => item.role === 'ai' || item.role === 'asset');

    if (!conversation.question && !project) {
      setViewMode('분석 비교');
      return;
    }

    setRestoredData({
      projectId: project?.id || conversation.projectId || conversation.id,
      q: lastUserMessage?.text || conversation.question || project?.title,
      a: lastAiMessage?.text || `"${conversation.title}" 프로젝트로 저장된 최근 분석 대화입니다.`,
      projectTitle: project?.title || conversation.title,
      inviteCode: project?.inviteCode,
      files: project?.files || [],
      thread,
    });
    setViewMode('분석 비교');
  };

  const isFullView = ['공유', '분석 비교', '내 프로젝트', '마이페이지'].includes(viewMode);

  return (
    <Container>
      <SidebarOpenButton
        type="button"
        $visible={isSidebarCollapsed}
        onClick={() => setIsSidebarCollapsed(false)}
        aria-label="사이드바 열기"
      >
        <FiChevronRight />
      </SidebarOpenButton>

      <SidebarSlot $collapsed={isSidebarCollapsed}>
        <Sidebar 
          viewMode={viewMode}
          onMenuClick={handleMenuRouting}
          onLogoClick={() => { setViewMode('main'); setRestoredData(null); }}
          isLoggedIn={isLoggedIn}
          username={user?.username || 'Guest'}
          onProfileClick={() => handleMenuRouting('프로필클릭')} 
          collapsed={isSidebarCollapsed}
          onCollapse={() => setIsSidebarCollapsed(true)}
          recentConversations={recentConversations}
          onRecentConversationClick={handleRecentConversationClick}
        />
      </SidebarSlot>

      <MainContent $isFullView={isFullView} $sidebarCollapsed={isSidebarCollapsed}>
        
        {/* ❌ 중복되었던 대량의 모달 마크업들(RecommendBox, FigAuthBox 렌더링 블록)을 
             여기가 아니라 하단 <AuthModal /> 하나로 통합하여 깔끔하게 제거했습니다. */}

        {!isFullView && (
          <TopAuth>
            {isLoggedIn ? (
              <span onClick={handleAbsoluteLogout}>Logout</span>
            ) : (
              <>
                <span onClick={openLoginPopup}>Login</span>
                <span onClick={openSignupPopup}>signup</span>
              </>
            )}
          </TopAuth>
        )}
        
        {viewMode === 'main' && (
          <MainDashboard>
            {isSidebarCollapsed && (
              <DashboardBrand onClick={() => setViewMode('main')}>
                <div className="logo"><RiRobot2Line /></div>
                <div className="brand-text"><span>ChatBot AI</span>PaperMate</div>
              </DashboardBrand>
            )}
            <h2>논문 읽는 시간을 1/10으로,<br />협업의 깊이는 2배로</h2>
            <div className="sub">HWP, PDF 등 다양한 포맷의 논문을 올리면 AI가 핵심을 분석하고<br />팀원과 실시간으로 공유할 수 있어요.</div>
            
            <GridContainer>
              <FeatureCard onClick={() => handleMenuRouting('분석 비교')}>
                <div className="icon-box"><i className="fa-regular fa-file-lines"></i></div>
                <div className="text-box"><h4>문서 분석 · 요약</h4><p>HWP, HWPX, PDF 문서의 핵심 내용을 추출하고 요약합니다.</p></div>
              </FeatureCard>
              <FeatureCard onClick={() => handleMenuRouting('분석 비교')}>
                <div className="icon-box"><i className="fa-regular fa-copy"></i></div>
                <div className="text-box"><h4>다중문서 비교</h4><p>여러 문서를 비교하고 차이점을 시각화합니다.</p></div>
              </FeatureCard>
              <FeatureCard onClick={() => handleMenuRouting('내 프로젝트')}>
                <div className="icon-box"><i className="fa-solid fa-chart-simple"></i></div>
                <div className="text-box"><h4>데이터 시각화</h4><p>문서 내 데이터를 차트, 그래프로 변환합니다.</p></div>
              </FeatureCard>
              <FeatureCard onClick={() => handleMenuRouting('공유')}>
                <div className="icon-box"><i className="fa-regular fa-user-group"></i></div>
                <div className="text-box"><h4>협업공간</h4><p>초대 코드로 팀원을 초대하고, 분석 결과를 함께 검토합니다.</p></div>
              </FeatureCard>
            </GridContainer>
          </MainDashboard>
        )}
        
        {viewMode === '내 프로젝트' && <Project onProjectRestore={handleProjectRestoreJump} />}
        {viewMode === '마이페이지' && <MypageC onLogoutClick={handleAbsoluteLogout} />}
        {viewMode === '공유' && <ShareC onRestoreTrigger={handleTimelineRestoreJump} username={user?.username} />}
        {viewMode === '분석 비교' && <AnalysisC restoredData={restoredData} clearRestore={() => setRestoredData(null)} />}
        
        {/* ── 💡 분리된 모달을 한 곳에 주입하여 깔끔하게 통합 ── */}
        <AuthModal 
          modalMode={modalMode} 
          setModalMode={setModalMode} 
          formData={formData}
          onInputChange={handleInputChange}
          onLoginSubmit={() => submitAuthRequest('login')} 
          onSignupSubmit={() => submitAuthRequest('signup')} 
          authError={authError}
          authLoading={authLoading}
        />
      </MainContent>
    </Container>
  );
}

export default Home;
