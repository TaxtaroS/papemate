// 초보자 안내: styled-components로 화면의 색상, 간격, 배치 같은 스타일을 정의하는 파일입니다.

import styled from 'styled-components';
import { palette } from '../../shared/palette';

/* Home 페이지 전용 스타일 모음입니다.
   페이지 컴포넌트에는 화면 흐름과 이벤트 로직만 남기기 위해 styled-components를 이 파일로 분리했습니다. */
export const Container = styled.div`
  display: flex; width: 100%; height: 100vh; width: 100vw; overflow: hidden; box-sizing: border-box;
`;

export const SidebarSlot = styled.div<{ $collapsed?: boolean }>`
  width: ${props => props.$collapsed ? '0px' : 'clamp(232px, 19vw, 280px)'};
  height: 100vh;
  flex-shrink: 0;
  overflow: visible;
  transition: width 0.22s ease;
`;

export const SidebarOpenButton = styled.button<{ $visible?: boolean; $isFullView?: boolean }>`
  position: fixed;
  top: ${props => props.$isFullView ? '50%' : '18px'};
  left: ${props => props.$isFullView ? '0' : '12px'};
  transform: ${props => props.$isFullView ? 'translateY(-50%)' : 'none'};
  z-index: 30;
  width: ${props => props.$isFullView ? '36px' : '28px'};
  height: ${props => props.$isFullView ? '48px' : '28px'};
  border: 1px solid ${props => props.$isFullView ? 'rgba(20, 125, 115, 0.18)' : '#cbd5e1'};
  border-left: ${props => props.$isFullView ? 'none' : '1px solid #cbd5e1'};
  border-radius: ${props => props.$isFullView ? '0 12px 12px 0' : '8px'};
  background: #ffffff;
  color: ${props => props.$isFullView ? '#126f67' : '#0f172a'};
  display: ${props => props.$visible ? 'inline-flex' : 'none'};
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.1);

  &:hover {
    color: #0ea5a4;
    border-color: #94a3b8;
    transform: ${props => props.$isFullView ? 'translateY(-50%) translateX(2px)' : 'none'};
  }

  svg {
    width: ${props => props.$isFullView ? '18px' : '16px'};
    height: ${props => props.$isFullView ? '18px' : '16px'};
  }
`;

export const MainContent = styled.main<{ $isFullView?: boolean; $sidebarCollapsed?: boolean }>`
  flex: 1; display: flex; flex-direction: column; 
  background: #f9fbe7;      /* 💡 기본 베이스 미색 */
  padding: ${props => props.$isFullView ? '0px' : '24px 40px'}; 
  padding-left: ${props => {
    if (!props.$sidebarCollapsed) return props.$isFullView ? '0px' : '40px';
    return props.$isFullView ? '0px' : '68px';
  }};
  box-sizing: border-box; height: 100vh; overflow: hidden; position: relative;
  transition: padding-left 0.22s ease;

  @media (max-width: 900px) {
    overflow-y: auto;
    padding: ${props => props.$isFullView ? '0px' : '20px'};
    padding-left: ${props => {
      if (!props.$sidebarCollapsed) return props.$isFullView ? '0px' : '20px';
      return props.$isFullView ? '0px' : '52px';
    }};
  }
`;

export const TopAuth = styled.div`
  display: flex; justify-content: flex-end; gap: 24px; 
  font-size: 13.5px; 
  font-weight: 700; 
  color: ${palette.slate[5]};           
  margin-top: 16px; margin-right: 40px; flex-shrink: 0;
  span { cursor: pointer; transition: color 0.15s; &:hover { color: ${palette.teal[5]}; } }

  @media (max-width: 560px) {
    margin-right: 0;
    justify-content: center;
  }
`;

export const MainDashboard = styled.div`
  flex: 1; 
  display: flex; 
  flex-direction: column; 
  justify-content: center; 
  align-items: center; 
  padding: 40px; 
  box-sizing: border-box; 
  position: relative;
  
  h2 { 
    font-size: 30px; font-weight: 800; color: #1e293b; text-align: center; margin-bottom: 12px; line-height: 1.4; 
    letter-spacing: -0.5px; 
  }
  
  .sub { 
    font-size: 14px; color: #475569; text-align: center; margin-bottom: 36px; line-height: 1.6; 
  }

  @media (max-width: 760px) {
    justify-content: flex-start;
    /* 💡 화면이 작아졌을 때 위쪽 여백(padding-top)을 넉넉하게 줘서 답답함을 없앱니다. */
    padding: 50px 20px 30px 20px; 

    h2 {
      font-size: 24px;
      line-height: 1.35;
    }

    .sub {
      font-size: 13px;
      margin-bottom: 24px;
    }
  }
`;

export const DashboardBrand = styled.div`
  position: absolute;
  top: -30px;
  left: 28px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;

  .logo-image {
    display: block;
    width: 210px;
    height: 84px;
    object-fit: contain;
  }

  @media (max-width: 760px) {
    /* 💡 모바일에서는 강제 위치(absolute)를 해제하고 문서 흐름에 맞게 배치합니다. */
    position: relative; 
    top: 0;
    left: 0;
    margin-bottom: 20px; /* 로고와 밑에 있는 H2 제목 사이의 간격 */
    align-self: center;  /* 로고를 화면 중앙으로 예쁘게 정렬 */

    .logo-image {
      width: 150px;
      height: 60px;
    }
  }
`;

export const GridContainer = styled.div`
  // 💡 기존 grid 대신 flexbox를 사용하여 가로 배치
  display: flex; 
  gap: 20px; 
  width: 100%; 
  max-width: 1000px; // 3개가 넉넉히 들어가도록 최대 너비 확장
  height: 280px;     // 카드의 일정한 높이 고정 (필요에 따라 조절)
  margin-bottom: 36px;

  @media (max-width: 760px) {
    // 모바일에서는 세로로 배치하고 아코디언 효과 대신 기본 형태로 변경
    flex-direction: column;
    height: auto;
    gap: 14px;
    margin-bottom: 24px;
  }
`;

// Home.styles.ts 내 FeatureCard 부분 수정

export const FeatureCard = styled.div<{ $bgGradient?: string }>`
  background: ${props => props.$bgGradient || 'white'}; 
  border: 1px solid rgba(255, 255, 255, 0.5); 
  border-radius: 20px; 
  padding: 24px; 
  display: flex; 
  flex-direction: column; 
  justify-content: flex-end; 
  position: relative; /* 💡 이모지를 고정하기 위해 필수 */
  overflow: hidden;   /* 💡 이모지가 카드 밖으로 튀어나가지 않게 필수 */
  cursor: pointer; 
  
  flex: 1; 
  transition: flex 0.4s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.2s, transform 0.2s;

  &:hover { 
    flex: 2.5; 
    box-shadow: 0 15px 30px -5px rgba(0,0,0,0.08); 
    transform: translateY(-4px); 
  }

  .content-wrapper {
    position: relative;
    z-index: 2; /* 글자가 이모지 위로 오도록 */
  }

  .icon-box { 
    width: 44px; height: 44px; border-radius: 12px; 
    background: rgba(255, 255, 255, 0.6); 
    color: #0d9488;            
    display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;
    margin-bottom: 16px; 
    backdrop-filter: blur(4px); 
  }
  
  /* 💡 글자가 아이콘 영역을 침범하지 않도록 너비 제한 추가 */
  /* 💡 텍스트가 차지하는 최대 너비를 더 줄여서 여백 확보 */
  .text-box { 
    width: 64%; /* 75% -> 60%로 줄임 */
    word-break: keep-all; 
    
    h4 { margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: #1e293b; } 
    p { margin: 0; font-size: 13px; color: #475569; line-height: 1.5; font-weight: 600; min-height: 60px; } 
  }

  /* 💡 이모지 크기를 살짝 줄이고, 오른쪽 아래로 더 밀어냄 */
  .floating-emoji {
    position: absolute;
    right: -15px;    /* -15px -> -25px (더 오른쪽으로) */
    bottom: 0px;   /* -30px -> -40px (더 아래로) */
    font-size: 120px; /* 130px -> 110px (크기 살짝 축소) */
    line-height: 1;
    z-index: 0;      
    opacity: 0.3;    /* 평소엔 조금 더 연하게 설정 */
    user-select: none; 
    text-shadow: 10px 20px 25px rgba(0, 0, 0, 0.15); 
    transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.4s;
  }

  /* 마우스를 올렸을 때 애니메이션 */
  &:hover .floating-emoji {
    transform: translateY(-15px) scale(1.05) rotate(-8deg);
    opacity: 0.8;
  }

  @media (max-width: 760px) {
    flex: none;
    height: 120px;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 16px;
    padding: 18px;

    &:hover {
      flex: none;
      transform: translateY(-2px);
    }
    
    .icon-box { margin-bottom: 0; }
    
    .floating-emoji {
      font-size: 80px;
      right: 0px;
      bottom: -15px;
      opacity: 0.3; 
    }
  }
`;
