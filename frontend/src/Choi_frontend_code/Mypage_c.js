import React, { useEffect, useState } from 'react';
// 팀원이 작성한 마이페이지 전용 CSS 및 공통 레이아웃 CSS를 불러옵니다.
import '../css/reset.css';
import '../css/layout.css';
import '../css/mypage.css';

function Mypage() {
  const [username, setUsername] = useState('user14530');

  useEffect(() => {
    // 혹시 마이페이지에도 로그인 상태나 저장된 유저네임 반영이 필요할 경우를 위한 처리
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  return (
    <div className="mypage-wrap">
      {/* ── 왼쪽 프로필 패널 ── */}
      <aside className="mypage-left">
        {/* 로고 */}
        <a href="./index.html" className="mypage-logo">
          <div className="logo-icon-sm">
            <i className="fa-solid fa-robot"></i>
          </div>
          <div>
            <div className="mp-logo-sub">ChatBot AI</div>
            <div className="mp-logo-title">Paper Mate</div>
          </div>
        </a>

        {/* 아바타 및 유저명 */}
        <div className="mp-avatar">
          <i className="fa-regular fa-circle-user"></i>
        </div>
        <div className="mp-username">{username}</div>

        {/* 프로필 관리 버튼 */}
        <button className="mp-btn">프로필 수정</button>
        <button className="mp-btn">비밀번호 변경</button>

        {/* 통계 수치 영역 */}
        <div className="mp-stats">
          <div className="mp-stat">
            <span className="mp-stat-num">14</span>
            <span className="mp-stat-label">프로젝트</span>
          </div>
          <div className="mp-stat">
            <span className="mp-stat-num">20</span>
            <span className="mp-stat-label">분석 질문</span>
          </div>
          <div className="mp-stat">
            <span className="mp-stat-num">5</span>
            <span className="mp-stat-label">자료</span>
          </div>
          <div className="mp-stat">
            <span className="mp-stat-num">2</span>
            <span className="mp-stat-label">참여 팀</span>
          </div>
        </div>

        {/* 회원탈퇴 버튼 */}
        <button className="mp-withdraw-btn">회원탈퇴</button>
      </aside>

      {/* ── 오른쪽 콘텐츠 영역 ── */}
      <main className="mypage-right">
        {/* 저장된 시각화 보관함 */}
        <section className="mp-section">
          <div className="mp-section-header">
            <h2>저장된 시각화 보관함</h2>
            <button className="mp-view-all">전체 보기</button>
          </div>

          <div className="mp-viz-grid">
            {/* 차트 카드 1 */}
            <div className="mp-viz-card">
              <div className="mp-viz-thumb">
                <i className="fa-solid fa-chart-bar" style={{ color: '#4c8bf5' }}></i>
              </div>
              <div className="mp-viz-name">정확도 비교 차트</div>
              <div className="mp-viz-date">2026.05.13</div>
            </div>

            {/* 차트 카드 2 */}
            <div className="mp-viz-card">
              <div className="mp-viz-thumb">
                <i className="fa-solid fa-chart-pie" style={{ color: '#0ea5a4' }}></i>
              </div>
              <div className="mp-viz-name">데이터셋 분포</div>
              <div className="mp-viz-date">2026.04.22</div>
            </div>

            {/* 차트 카드 3 */}
            <div className="mp-viz-card">
              <div className="mp-viz-thumb">
                <i className="fa-solid fa-table" style={{ color: '#62ce6e' }}></i>
              </div>
              <div className="mp-viz-name">모델 성능 비교표</div>
              <div className="mp-viz-date">2026.03.04</div>
            </div>
          </div>
        </section>

        {/* 최근 분석 히스토리 */}
        <section className="mp-section">
          <div className="mp-section-header">
            <h2>최근 분석 히스토리</h2>
            <button className="mp-view-all">전체 보기</button>
          </div>

          <div className="mp-history-list">
            <div className="mp-history-item">
              <i className="fa-regular fa-file-pdf mp-file-icon"></i>
              <span className="mp-history-name">딥러닝 이미지 분류 연구 비교</span>
              <span className="mp-history-date">2026.05.13</span>
            </div>

            <div className="mp-history-item">
              <i className="fa-regular fa-file-pdf mp-file-icon"></i>
              <span className="mp-history-name">자연어처리 감정분석 최신 동향</span>
              <span className="mp-history-date">2026.04.22</span>
            </div>

            <div className="mp-history-item">
              <i className="fa-regular fa-file-pdf mp-file-icon"></i>
              <span className="mp-history-name">강화학습 보상 함수 설계 논문</span>
              <span className="mp-history-date">2026.03.04</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Mypage;