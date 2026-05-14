import React, { useState } from 'react';
// 팀원이 만든 인증(Auth) 관련 CSS 파일들을 불러옵니다.
import './css/reset.css';
import './css/layout.css';
import './css/auth.css';

function Login() {
  // 1. 아이디와 비밀번호 입력값을 저장할 리액트 상태(State)
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');

  // 2. 로그인 버튼 클릭 시 실행될 함수
  const handleLogin = () => {
    // 입력값이 비어있는지 간단하게 체크
    if (!id || !pw) {
      alert('아이디와 비밀번호를 모두 입력해 주세요.');
      return;
    }

    // 우선 기존 HTML에 있던 localStorage 방식을 리액트 함수 안으로 이식합니다.
    // (실제 로그인 검증 로직은 나중에 auth.js 코드를 여기에 합치면서 보완할 예정입니다!)
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('username', id); 

    // 로그인 완료 후 메인 분석 페이지(아까 만든 Analysis)로 이동
    // (리액트 라우터를 연동하기 전이라면 임시로 window.location을 사용합니다.)
    window.location.href = './analysis.html'; 
  };

  return (
    <div className="auth-body-wrapper" style={{ minHeight: '100vh' }}>
      <div className="auth-page">
        {/* 로고 영역 */}
        <a href="./index.html" className="auth-logo">
          <div className="logo-icon-sm">
            <i className="fa-solid fa-robot"></i>
          </div>
          <div>
            <div className="auth-logo-sub">ChatBot AI</div>
            <div className="auth-logo-title">Paper Mate</div>
          </div>
        </a>

        {/* 로그인 카드 영역 */}
        <div className="auth-card">
          {/* 소셜 로그인 버튼들 */}
          <button className="social-btn google-btn">
            <span className="social-icon google-icon">G</span> Gmail 연동
          </button>
          <button className="social-btn kakao-btn">
            <span className="social-icon kakao-icon">TALK</span> 카카오톡 연동
          </button>
          <button className="social-btn naver-btn">
            <span className="social-icon naver-icon">N</span> 네이버 연동
          </button>

          <div className="auth-divider">
            <span>또는</span>
          </div>

          {/* 아이디 입력창: value와 onChange로 리액트 상태와 동기화 */}
          <input
            id="inputId"
            type="text"
            className="auth-input"
            placeholder="아이디"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
          
          {/* 비밀번호 입력창 */}
          <input
            id="inputPw"
            type="password"
            className="auth-input"
            placeholder="비밀번호"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />

          {/* 로그인 제출 버튼 */}
          <div className="auth-submit-row">
            <button className="auth-submit-btn" onClick={handleLogin}>
              계속
            </button>
          </div>

          <p className="auth-switch">
            계정이 없으신가요? <a href="./signup.html">회원가입</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;