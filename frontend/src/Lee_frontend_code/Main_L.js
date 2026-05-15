import React, { useState } from 'react';
import styled from 'styled-components';
import { palette } from '../shared/palette';
import AuthModal_L from './AuthModal_L';

const Container = styled.div`
  display: flex;
  height: 100vh;
  background-color: white;
`;

const NavLink = styled.span`
  text-decoration: none;
  color: ${palette.gray[8]};
  cursor: pointer;
  &:hover { color: ${palette.teal[7]}; }
`;

const MainContent = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  position: relative;
  padding-bottom: 180px; 
  overflow-y: auto;
`;

const Header = styled.div`
  align-self: flex-end;
  display: flex;
  gap: 20px;
  margin-bottom: 60px;
  font-size: 14px;
`;

const HeroSection = styled.div`
  text-align: center;
  margin-bottom: 50px;
  h1 { font-size: 32px; font-weight: bold; margin-bottom: 20px; line-height: 1.4; }
  p { color: ${palette.gray[6]}; font-size: 15px; line-height: 1.6; }
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  width: 100%;
  max-width: 650px;
`;

const FeatureCard = styled.div`
  background-color: #FFFDE7;
  padding: 20px;
  border-radius: 15px;
  display: flex;
  gap: 15px;
  border: 1px solid #FFF9C4;
  transition: transform 0.2s;
  &:hover { transform: translateY(-3px); }
  .icon { font-size: 24px; }
  h4 { margin: 0 0 5px 0; font-size: 16px; font-weight: bold; }
  span { font-size: 13px; color: ${palette.gray[6]}; line-height: 1.4; }
`;

const InputArea = styled.div`
  position: absolute;
  bottom: 40px;
  width: 90%;
  max-width: 750px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  background: white;
`;

const FileTagWrapper = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const FileTag = styled.div`
  background-color: ${palette.gray[1]};
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid ${palette.gray[2]};
  cursor: pointer;
`;

const ChatInputWrapper = styled.div`
  width: 100%;
  border: 2px solid ${palette.gray[9]};
  border-radius: 20px;
  display: flex;
  padding: 12px 20px;
  align-items: center;
  background: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 16px;
    background: transparent;
  }
`;

function Main_L() {
  // 1. 모달의 열림 상태와 초기 모드('login' 혹은 'signup')를 관리합니다.
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [initialAuthMode, setInitialAuthMode] = useState('login');

  // 2. 버튼 클릭 시 어떤 모드로 열지 설정하고 모달을 띄우는 함수입니다.
  const handleOpenAuth = (mode) => {
    setInitialAuthMode(mode);
    setIsAuthOpen(true);
  };

  return (
    <Container>
      <MainContent>
        <Header>
          {/* 3. 클릭 시 각각 'login', 'signup' 정보를 넘겨줍니다. */}
          <NavLink onClick={() => handleOpenAuth('login')}>login</NavLink>
          <NavLink onClick={() => handleOpenAuth('signup')}>signup</NavLink>
        </Header>

        <HeroSection>
          <h1>논문 읽는 시간을 1/10로,<br/>협업의 깊이는 2배로</h1>
          <p>HWP, PDF 등 다양한 포맷의 논문을 올리면 AI가 핵심을 분석하고<br/>팀원과 실시간으로 공유할 수 있어요.</p>
        </HeroSection>

        <CardGrid>
          <FeatureCard>
            <div className="icon">📄</div>
            <div>
              <h4>문서 분석 · 요약</h4>
              <span>HWP, HWPX, PDF 문서의 핵심 내용을 추출하고 요약합니다.</span>
            </div>
          </FeatureCard>
          <FeatureCard>
            <div className="icon">📊</div>
            <div>
              <h4>다중문서 비교</h4>
              <span>여러 문서들을 비교하고 차이점을 시각화 합니다.</span>
            </div>
          </FeatureCard>
          <FeatureCard>
            <div className="icon">📈</div>
            <div>
              <h4>데이터 시각화</h4>
              <span>문서 내 데이터를 차트, 그래프로 변환합니다.</span>
            </div>
          </FeatureCard>
          <FeatureCard>
            <div className="icon">👥</div>
            <div>
              <h4>협업공간</h4>
              <span>초대 코드로 팀원을 초대하고, 분석 결과를 함께 검토합니다.</span>
            </div>
          </FeatureCard>
        </CardGrid>

        <InputArea>
          <FileTagWrapper>
            <FileTag>📄 PDF main123.pdf <span style={{marginLeft: 5}}>✕</span></FileTag>
            <FileTag>📄 HWP main123.hwp <span style={{marginLeft: 5}}>✕</span></FileTag>
          </FileTagWrapper>
          <ChatInputWrapper>
            <button style={{background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', marginRight: 10}}>+</button>
            <input type="text" placeholder="질문을 입력하세요..." />
            <button style={{background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', marginLeft: 10}}>➡️</button>
          </ChatInputWrapper>
        </InputArea>

        {/* 4. 모달을 렌더링할 때 initialMode를 함께 전달합니다. */}
        {isAuthOpen && (
          <AuthModal_L 
            initialMode={initialAuthMode} 
            onClose={() => setIsAuthOpen(false)} 
          />
        )}
      </MainContent>
    </Container>
  );
}

export default Main_L;