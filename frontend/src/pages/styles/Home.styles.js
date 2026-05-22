import styled from 'styled-components';
import { palette } from '../../shared/palette';

/* Home 페이지 전용 스타일 모음입니다.
   페이지 컴포넌트에는 화면 흐름과 이벤트 로직만 남기기 위해 styled-components를 이 파일로 분리했습니다. */
export const Container = styled.div`
  display: flex; width: 100%; height: 100vh; width: 100vw; overflow: hidden; box-sizing: border-box;
`;

export const SidebarSlot = styled.div`
  width: ${props => props.$collapsed ? '0px' : 'clamp(232px, 19vw, 280px)'};
  height: 100vh;
  flex-shrink: 0;
  overflow: visible;
  transition: width 0.22s ease;
`;

export const SidebarOpenButton = styled.button`
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

export const MainContent = styled.main`
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
  flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 40px; box-sizing: border-box; position: relative;
  h2 { 
    font-size: 30px; font-weight: 800; color: ${palette.slate[8]}; text-align: center; margin-bottom: 12px; line-height: 1.4; 
    letter-spacing: -0.5px; 
  }
  .sub { 
    font-size: 14px; color: ${palette.slate[5]}; text-align: center; margin-bottom: 36px; line-height: 1.6; 
  }

  @media (max-width: 760px) {
    justify-content: flex-start;
    padding: 28px 0;

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

  @media (max-width: 560px) {
    top: -20px;
    left: 20px;

    .logo-image {
      width: 150px;
      height: 60px;
    }
  }
`;

export const GridContainer = styled.div`
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; width: 100%; max-width: 800px; margin-bottom: 36px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    gap: 14px;
    margin-bottom: 24px;
  }
`;

export const FeatureCard = styled.div`
  background: white; 
  border: 1px solid ${palette.slate[2]}; 
  border-radius: 16px; padding: 24px; display: flex; gap: 16px; cursor: pointer; transition: all 0.2s ease-in-out;
  
  &:hover { 
    transform: translateY(-2px); 
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.04); 
    border-color: ${palette.slate[3]};   
  }
  
  .icon-box { 
    width: 44px; height: 44px; border-radius: 12px; 
    background: ${palette.teal[0]};       
    color: ${palette.teal[5]};            
    display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; 
  }
  
  .text-box { 
    h4 { margin: 0 0 6px 0; font-size: 14.5px; font-weight: 800; color: ${palette.slate[8]}; } 
    p { margin: 0; font-size: 12.5px; color: ${palette.slate[5]}; line-height: 1.5; font-weight: 600; } 
  }

  @media (max-width: 560px) {
    padding: 18px;
    align-items: flex-start;

    .icon-box {
      width: 38px;
      height: 38px;
      border-radius: 10px;
    }
  }
`;

export const FileTagRow = styled.div`
  display: flex; gap: 8px; margin-bottom: 12px;
  flex-wrap: wrap;
  
  .tag { 
    background: #ffffff; 
    border: 1px solid ${palette.slate[2]}; 
    padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; color: ${palette.slate[6]}; 
    display: flex; align-items: center; gap: 6px; 
    cursor: pointer;
    transition: all 0.15s;
    
    &:hover { background: ${palette.slate[1]}; color: ${palette.slate[8]}; border-color: ${palette.slate[3]}; }
  }
`;

export const MainSearchBar = styled.div`
  width: 100%; max-width: 800px; background: white; 
  border: 2px solid ${palette.slate[2]};  
  border-radius: 16px; padding: 8px 18px; display: flex; align-items: center;
  transition: border-color 0.15s;
  
  &:focus-within { border-color: ${palette.slate[5]}; } 
  
  input { 
    flex: 1; border: none; outline: none; padding: 10px 4px; 
    font-size: 14.5px; font-weight: 600; color: ${palette.slate[8]};
    &::placeholder { color: ${palette.slate[4]}; }
  }
  i { 
    color: ${palette.slate[4]}; font-size: 18px; cursor: pointer; 
    transition: color 0.15s;
    &:hover { color: ${palette.teal[5]}; } 
  }

  @media (max-width: 560px) {
    border-radius: 12px;
    padding: 6px 12px;

    input {
      font-size: 13px;
    }
  }
`;
