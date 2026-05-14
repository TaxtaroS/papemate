import React, { useEffect, useState } from 'react';
// 팀원이 작성한 대시보드 전용 CSS 및 공통 레이아웃 CSS를 불러옵니다.
import '../css/reset.css';
import '../css/layout.css';
import '../css/sidebar.css';
import '../css/dashboard-page.css';

function Dashboard() {
  const [username, setUsername] = useState('user14530');

  useEffect(() => {
    // 1. 로그인 여부 검사
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      window.location.href = './login.html';
    }

    // 2. 로그인된 유저네임 반영
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  return (
    <div className="container">
      {/* ── 사이드바 영역 ── */}
      <aside className="sidebar">
        <div>
          <div className="logo-wrap">
            <div className="logo-icon">
              <i className="fa-solid fa-robot"></i>
            </div>
            <div className="logo-text">
              <span>ChatBot AI</span>
              <h2>Paper Mate</h2>
            </div>
          </div>

          <div className="menu-group">
            <a href="./index.html" className="menu-link">
              <div className="menu-item">
                <i className="fa-regular fa-message"></i>
                <span>새 채팅</span>
              </div>
            </a>

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

          <hr />

          <div className="menu-bottom">
            <div className="menu-item">
              <i className="fa-solid fa-share-nodes"></i>
              <span>공유</span>
            </div>

            <div className="menu-item">
              <i className="fa-regular fa-clock"></i>
              <span>히스토리</span>
            </div>

            <div className="menu-item">
              <i className="fa-solid fa-chart-simple"></i>
              <span>분석 비교</span>
            </div>

            <div className="menu-item active-menu">
              <i className="fa-regular fa-folder"></i>
              <span>내 프로젝트</span>
            </div>
          </div>
        </div>

        <div className="user-box">
          <i className="fa-regular fa-circle-user"></i>
          <span id="sidebarUsername">{username}</span>
          <i className="fa-solid fa-gear"></i>
        </div>
      </aside>

      {/* ── 메인 대시보드 영역 ── */}
      <main className="dashboard-main">
        <div className="dashboard-header">
          <h1>내 프로젝트</h1>
          <button className="new-project-btn">+ 새 프로젝트...</button>
        </div>

        {/* 팀 프로젝트 초대 코드 안내 박스 */}
        <div className="invite-box">
          <div className="invite-left">
            🔑 초대 코드로 팀 프로젝트 참여 : <span class="invite-code">aa33ddf</span>
          </div>
          <button className="join-btn">참여하기</button>
        </div>

        {/* 프로젝트 카드 대시보드 그리드 */}
        <div className="dashboard-grid">
          {/* 카드 1 */}
          <div className="dashboard-card">
            <div className="card-top">
              <span className="tag pdf-tag">PDF x 3</span>
            </div>
            <h2>이미지 분류</h2>
            <p>최근 수정 2026.05.04</p>
            <div className="card-bottom">
              <div className="card-info">👥 개인</div>
              <i className="fa-solid fa-pen"></i>
            </div>
          </div>

          {/* 카드 2 */}
          <div className="dashboard-card">
            <div className="card-top">
              <span className="tag hwp-tag">hwp</span>
            </div>
            <h2>자연어 처리</h2>
            <p>최근 수정 2026.05.04</p>
            <div className="card-bottom">
              <div className="card-info">👤 개인</div>
              <i className="fa-solid fa-pen"></i>
            </div>
          </div>

          {/* 카드 3 */}
          <div className="dashboard-card">
            <div className="card-top">
              <span className="tag pdf-tag">PDF</span>
            </div>
            <h2>논문 분석 처리</h2>
            <p>최근 수정 2026.05.04</p>
            <div className="card-bottom">
              <div className="card-info">👤 개인</div>
              <i className="fa-solid fa-pen"></i>
            </div>
          </div>

          {/* 빈 프로젝트 추가 카드들 */}
          <div className="empty-card">
            +<br />
            새 프로젝트 추가
          </div>
          <div className="empty-card">
            +<br />
            새 프로젝트 추가
          </div>
          <div className="empty-card">
            +<br />
            새 프로젝트 추가
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;