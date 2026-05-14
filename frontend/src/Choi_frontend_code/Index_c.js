import React, { useState } from 'react';
// 팀원의 공통 레이아웃과 홈 화면 전용 CSS를 불러옵니다.
import '../css/reset.css';
import '../css/layout.css';
import '../css/sidebar.css';
import '../css/dashboard.css'; // 홈 화면 스타일이 담긴 파일

function Home() {
  // 팝업 오버레이의 열림/닫힘 상태를 관리하는 리액트 State (기본값: 닫힘)
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  // 권한이 필요한 메뉴 클릭 시 실행할 함수
  const handleAuthRequiredClick = () => {
    setIsOverlayOpen(true);
  };

  // 팝업 닫기 함수
  const handleClosePopup = () => {
    setIsOverlayOpen(false);
  };

  // 오버레이 바깥 영역 클릭 시 닫히게 하는 함수
  const handleOverlayClick = (e) => {
    // 클릭한 지점이 배경 팝업 껍데기 자체일 때만 닫기
    if (e.target.classList.contains('login-overlay')) {
      setIsOverlayOpen(false);
    }
  };

  return (
    <div className="container">
      {/* ── 사이드바 ── */}
      <aside className="sidebar">
        {/* 로고: 클릭하면 메인으로 */}
        <a href="./index.html" className="menu-link">
          <div className="logo-wrap">
            <div className="logo-icon">
              <i className="fa-solid fa-robot"></i>
            </div>
            <div className="logo-text">
              <span>ChatBot AI</span>
              <h2>Paper Mate</h2>
            </div>
          </div>
        </a>

        <div className="menu-group">
          <div className="menu-item active">
            <i className="fa-regular fa-message"></i>
            <span>새 채팅</span>
          </div>

          <div className="menu-sub">최근 대화</div>

          <div className="menu-item">
            <i className="fa-regular fa-message"></i>
            <span>Rag란 무엇인가</span>
          </div>

          <div className="menu-item">
            <i className="fa-regular fa-message"></i>
            <span>비교분석</span>
          </div>

          <div className="menu-item">
            <i className="fa-regular fa-message"></i>
            <span>LLM이란 무엇인가</span>
          </div>
        </div>

        {/* 비로그인: 하단 메뉴 클릭 시 팝업 실행하도록 onClick 연결 */}
        <div className="menu-bottom">
          <div className="menu-item" onClick={handleAuthRequiredClick}>
            <i className="fa-solid fa-share-nodes"></i>
            <span>공유</span>
          </div>

          <div className="menu-item" onClick={handleAuthRequiredClick}>
            <i className="fa-regular fa-clock"></i>
            <span>히스토리</span>
          </div>

          <div className="menu-item" onClick={handleAuthRequiredClick}>
            <i className="fa-solid fa-chart-simple"></i>
            <span>분석 비교</span>
          </div>

          <div className="menu-item" onClick={handleAuthRequiredClick}>
            <i className="fa-regular fa-folder"></i>
            <span>대시보드</span>
          </div>
        </div>

        {/* 비로그인 유저박스 */}
        <div className="user-box">
          <i className="fa-regular fa-circle-user"></i>
          <span>guest</span>
        </div>
      </aside>

      {/* ── 로그인 추천 팝업 오버레이 (조건부 클래스 적용) ── */}
      <div 
        className={`login-overlay ${isOverlayOpen ? 'show' : ''}`} 
        onClick={handleOverlayClick}
      >
        <div className="login-popup">
          {/* 팝업 로고 */}
          <div className="popup-logo">
            <div className="logo-icon">
              <i className="fa-solid fa-robot"></i>
            </div>
            <div className="logo-text">
              <span>ChatBot AI</span>
              <h2>Paper Mate</h2>
            </div>
          </div>

          <h3 className="popup-title">로그인을 추천 드립니다.</h3>
          <p className="popup-desc">
            로그인해 보관함을 이용하고,<br />
            팀원들과 함께 작업을 하고, 지난 답변을 검색해보세요
          </p>

          <div className="popup-btns">
            <a href="./login.html" className="popup-btn login-btn">Login</a>
            <a href="./signup.html" className="popup-btn signup-btn">signup</a>
          </div>

          <button className="popup-close" onClick={handleClosePopup}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      {/* ── 메인 영역 ── */}
      <main className="main-content">
        <div className="top-auth">
          <a href="./login.html" style={{ textDecoration: 'none', color: 'inherit' }}>Login</a>
          <a href="./signup.html" style={{ textDecoration: 'none', color: 'inherit' }}>signup</a>
        </div>

        <section className="hero">
          <h2>
            논문 읽는 시간을 1/10으로,<br />
            협업의 깊이는 2배로
          </h2>
          <p>
            HWP, PDF 등 다양한 포맷의 논문을 올리면 AI가 핵심을 분석하고<br />
            팀원과 실시간으로 공유할 수 있어요.
          </p>
        </section>

        {/* 피처 카드 그리드 */}
        <section className="feature-grid">
          <div className="feature-card">
            <i className="fa-solid fa-file"></i>
            <div>
              <h3>문서 분석 · 요약</h3>
              <p>HWP, HWPX, PDF 문서의 핵심 내용을 추출하고 요약합니다.</p>
            </div>
          </div>

          <div className="feature-card">
            <i className="fa-solid fa-copy"></i>
            <div>
              <h3>다중문서 비교</h3>
              <p>여러 문서를 비교하고 차이점을 시각화합니다.</p>
            </div>
          </div>

          <div className="feature-card">
            <i className="fa-solid fa-chart-column"></i>
            <div>
              <h3>데이터 시각화</h3>
              <p>문서 내 데이터를 차트로 변환합니다.</p>
            </div>
          </div>

          <div className="feature-card">
            <i className="fa-solid fa-users"></i>
            <div>
              <h3>협업공간</h3>
              <p>초대 코드로 팀원을 초대하고 분석 결과를 공유합니다.</p>
            </div>
          </div>
        </section>

        <div id="fileList"></div>

        {/* 파일 업로드 겸 채팅창 */}
        <section className="chat-box">
          <button className="plus-btn">
            <i className="fa-solid fa-plus"></i>
          </button>
          <input type="file" id="fileInput" multiple accept=".pdf,.hwp,.hwpx" />
          <input type="text" className="chat-input" placeholder="" />
          <button className="send-btn">
            <i className="fa-regular fa-paper-plane"></i>
          </button>
        </section>
      </main>
    </div>
  );
}

export default Home;