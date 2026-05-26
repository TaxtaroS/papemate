import React, { ChangeEvent, KeyboardEvent } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { RiKakaoTalkFill, RiRobot2Line } from 'react-icons/ri';
import { SiNaver } from 'react-icons/si';
import { FiX } from 'react-icons/fi';
import {
  CloseIconButton,
  FigAuthBox,
  ModalOverlay,
  RecommendBody,
  RecommendBox,
  RecommendHeader,
} from './styles/AuthModal.styles'; // 스타일 파일 확장자 주의

// 1. 타입 정의
type ModalMode = 'login' | 'signup' | 'recommend' | null;

interface FormData {
  id?: string;
  pw?: string;
  confirmPw?: string;
}

interface AuthModalProps {
  modalMode: ModalMode;
  setModalMode: (mode: ModalMode) => void;
  formData: FormData;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onLoginSubmit: () => void;
  onSignupSubmit: () => void;
  authError: string | null;
  authLoading: boolean;
}

// 2. 내부 컴포넌트 타입 적용
const SocialButtons = ({ mode }: { mode: 'login' | 'signup' }) => {
  const isSignup = mode === 'signup';

  return (
    <div className="social-stack">
      <button className="social-btn google" type="button" aria-label="Google 연동">
        <FcGoogle />
        <span>{isSignup ? 'Gmail로 시작하기' : 'Google로 계속하기'}</span>
      </button>
      <button className="social-btn kakao" type="button" aria-label="카카오톡 연동">
        <RiKakaoTalkFill />
        <span>{isSignup ? '카카오톡으로 시작하기' : '카카오로 계속하기'}</span>
      </button>
      <button className="social-btn naver" type="button" aria-label="네이버 연동">
        <SiNaver />
        <span>{isSignup ? '네이버로 시작하기' : '네이버로 계속하기'}</span>
      </button>
    </div>
  );
};

// 3. 메인 컴포넌트
function AuthModal({
  modalMode,
  setModalMode,
  formData,
  onInputChange,
  onLoginSubmit,
  onSignupSubmit,
  authError,
  authLoading,
}: AuthModalProps) {
  if (!modalMode) return null;

  const handleEnterSubmit = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || authLoading) return;
    if (modalMode === 'login') onLoginSubmit();
    if (modalMode === 'signup') onSignupSubmit();
  };

  return (
    <ModalOverlay $show={!!modalMode} onClick={() => setModalMode(null)}>
      {modalMode === 'recommend' && (
        <RecommendBox onClick={(event) => event.stopPropagation()}>
          <CloseIconButton type="button" onClick={() => setModalMode(null)} aria-label="닫기">
            <FiX />
          </CloseIconButton>

          <RecommendHeader>
            <div className="logo-box"><RiRobot2Line /></div>
            <div className="brand-title"><span>ChatBot AI</span>Paper Mate</div>
          </RecommendHeader>

          <RecommendBody>
            <h3>로그인이 필요한 기능입니다</h3>
            <p>로그인하면 프로젝트, 분석 질문, 자료와 참여 팀을 계정별로 관리할 수 있어요.</p>
            <div className="auth-links">
              <span onClick={() => setModalMode('login')}>Login</span>
              <span onClick={() => setModalMode('signup')}>signup</span>
            </div>
          </RecommendBody>
        </RecommendBox>
      )}

      {(modalMode === 'login' || modalMode === 'signup') && (
        <FigAuthBox onClick={(event) => event.stopPropagation()} onKeyDown={handleEnterSubmit}>
          <CloseIconButton type="button" onClick={() => setModalMode(null)} aria-label="닫기">
            <FiX />
          </CloseIconButton>

          <div className="popup-logo">
            <div className="logo-icon"><RiRobot2Line /></div>
            <div className="logo-text"><h2>Paper Mate</h2></div>
          </div>

          <h3 className="popup-title">{modalMode === 'login' ? '로그인' : '회원가입'}</h3>
          <SocialButtons mode={modalMode === 'signup' ? 'signup' : 'login'} />
          <div className="divider">{modalMode === 'login' ? '또는' : '또는 일반 가입'}</div>

          {modalMode === 'login' ? (
            <>
              <div className="input-group">
                <input name="id" placeholder="아이디" value={formData?.id || ''} onChange={onInputChange} />
                <input name="pw" type="password" placeholder="비밀번호" value={formData?.pw || ''} onChange={onInputChange} />
              </div>

              <div className="action-row">
                <button className="continue-btn" type="button" onClick={onLoginSubmit} disabled={authLoading}>
                  {authLoading ? '로그인 중...' : '로그인'}
                </button>
              </div>
              {authError && <p className="auth-error">{authError}</p>}

              <p className="toggle-guide">
                계정이 없으신가요?
                <button type="button" onClick={() => setModalMode('signup')}>회원가입</button>
              </p>
            </>
          ) : (
            <>
              <div className="input-group">
                <input name="id" placeholder="사용자 아이디" value={formData?.id || ''} onChange={onInputChange} />
                <input name="pw" type="password" placeholder="비밀번호" value={formData?.pw || ''} onChange={onInputChange} />
                <input name="confirmPw" type="password" placeholder="비밀번호 확인" value={formData?.confirmPw || ''} onChange={onInputChange} />
              </div>

              <div className="action-row">
                <button className="continue-btn" type="button" onClick={onSignupSubmit} disabled={authLoading}>
                  {authLoading ? '가입 중...' : '가입하기'}
                </button>
              </div>
              {authError && <p className="auth-error">{authError}</p>}

              <p className="toggle-guide">
                이미 계정이 있으신가요?
                <button type="button" onClick={() => setModalMode('login')}>로그인</button>
              </p>
            </>
          )}
        </FigAuthBox>
      )}
    </ModalOverlay>
  );
}

export default AuthModal;