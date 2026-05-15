import React, { useState } from 'react';
import styled from 'styled-components';
import { palette } from '../shared/palette';

// 1. 모달 배경 및 카드 설정
const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  display: flex; justify-content: center; align-items: center;
  z-index: 9999;
`;

const ModalCard = styled.div`
  background-color: white;
  width: 90%;
  max-width: 400px;
  padding: 35px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute; top: 15px; right: 15px;
  background: none; border: none; font-size: 24px; cursor: pointer; color: ${palette.gray[4]};
`;

const Title = styled.h2`
  text-align: center; font-size: 24px; margin-bottom: 25px; color: ${palette.gray[8]};
`;

// 2. 소셜 로그인 버튼들
const SocialButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
`;

const SocialButton = styled.button`
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid ${palette.gray[2]};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-weight: 600;
  font-size: 14px;
  transition: opacity 0.2s;

  &:hover { opacity: 0.9; }

  /* 브랜드별 컬러 설정 */
  &.google { background-color: white; color: ${palette.gray[7]}; }
  &.kakao { background-color: #FEE500; color: #191919; border: none; }
  &.naver { background-color: #03C75A; color: white; border: none; }
`;

const Divider = styled.div`
  display: flex; align-items: center; color: ${palette.gray[4]}; font-size: 12px; margin: 20px 0;
  &::before, &::after { content: ""; flex: 1; height: 1px; background: ${palette.gray[2]}; margin: 0 10px; }
`;

// 3. 일반 입력창 및 버튼
const StyledInput = styled.input`
  width: 100%; padding: 12px; margin-bottom: 10px;
  border: 1px solid ${palette.gray[2]}; border-radius: 8px;
  &:focus { outline: none; border-color: ${palette.indigo[4]}; }
`;

const LoginSubmitButton = styled.button`
  width: 100%; padding: 12px; margin-top: 10px;
  background-color: ${palette.indigo[5]}; color: white;
  border: none; border-radius: 8px; cursor: pointer; font-weight: 600;
  &:hover { background-color: ${palette.indigo[7]}; }
`;

const ToggleText = styled.p`
  text-align: center; margin-top: 20px; font-size: 13px; color: ${palette.gray[6]};
  span { color: ${palette.indigo[5]}; cursor: pointer; font-weight: bold; margin-left: 5px; }
`;

function AuthModal_L({ onClose, initialMode = 'login' }) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');

  const handleLogin = () => {
    if (!id || !pw) return alert("아이디와 비밀번호를 입력해주세요!");
    alert(`환영합니다, ${id}님!`);
    onClose();
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalCard onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>&times;</CloseButton>
        <Title>{isLogin ? "로그인" : "회원가입"}</Title>

        <SocialButtonGroup>
          <SocialButton className="google" onClick={() => alert('구글 로그인')}>
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" width="18" alt="" />
            Google로 계속하기
          </SocialButton>
          <SocialButton className="kakao" onClick={() => alert('카톡 로그인')}>
            <i className="fa-solid fa-comment" style={{fontSize: '18px'}}></i>
            카카오톡으로 시작하기
          </SocialButton>
          <SocialButton className="naver" onClick={() => alert('네이버 로그인')}>
            <span style={{fontWeight: '900', fontSize: '18px'}}>N</span>
            네이버로 시작하기
          </SocialButton>
        </SocialButtonGroup>

        <Divider>또는</Divider>

        <StyledInput placeholder="아이디" value={id} onChange={(e) => setId(e.target.value)} />
        <StyledInput type="password" placeholder="비밀번호" value={pw} onChange={(e) => setPw(e.target.value)} />

        <LoginSubmitButton onClick={handleLogin}>
          {isLogin ? "로그인" : "가입하기"}
        </LoginSubmitButton>

        <ToggleText>
          {isLogin ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}
          <span onClick={() => setIsLogin(!isLogin)}>{isLogin ? "회원가입" : "로그인"}</span>
        </ToggleText>
      </ModalCard>
    </ModalOverlay>
  );
}

export default AuthModal_L;