// 초보자 안내: styled-components로 화면의 색상, 간격, 배치 같은 스타일을 정의하는 파일입니다.

import styled from 'styled-components';
import { palette } from '../../shared/palette';

/* Project 페이지 전용 스타일 모음입니다.
   페이지 컴포넌트에는 화면 흐름과 이벤트 로직만 남기기 위해 styled-components를 이 파일로 분리했습니다. */
export const ProjectsContainer = styled.div`
  flex: 1; padding: 40px 52px; background: #ffffff; overflow-y: auto; box-sizing: border-box;

  @media (max-width: 900px) {
    padding: 28px 32px;
  }

  @media (max-width: 560px) {
    padding: 22px 18px;
  }
`;

export const HeaderSection = styled.div`
  margin-bottom: 32px;
  h2 { font-size: 22px; font-weight: 800; color: #1e293b; margin: 0; }
`;

export const SectionTitleRow = styled.div`
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; 
  h3 { font-size: 18px; font-weight: 800; color: #1e293b; margin: 0; } 
  
  .btn-group {
    display: flex; gap: 10px;
  }

  .sub-btn { 
    background: #ffffff; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; 
    font-weight: 700; color: #64748b; font-size: 12px; cursor: pointer; transition: all 0.15s;
    &:hover { background: #f8fafc; color: #1e293b; }
  } 

  .primary-btn {
    background: #0ea5a4; color: #ffffff; border: none; border-radius: 8px;
    padding: 10px 18px; font-size: 14px; font-weight: 700; cursor: pointer;
    display: flex; align-items: center; gap: 6px; transition: background 0.15s;
    &:hover { background: #0d9493; }
  }

  @media (max-width: 680px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;

    .btn-group,
    .primary-btn {
      width: 100%;
    }

    .sub-btn,
    .primary-btn {
      justify-content: center;
      text-align: center;
    }
  }
`;

export const VisualSection = styled.div` margin-bottom: 48px; `;

export const VisualBoxContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 24px;
`;

export const VisualCard = styled.div`
  border: 1px solid #e2e8f0; border-radius: 12px; background: white; padding: 16px;
  cursor: pointer; transition: all 0.2s ease-in-out; box-sizing: border-box;
  position: relative; /* 💡 삭제 버튼 위치의 기준점 */

  &:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.04); border-color: #cbd5e1; }

  /* 💡 삭제 버튼: 평소엔 투명하다가 호버 시 등장 */
  .delete-visual-btn {
    position: absolute; top: 12px; right: 12px;
    background: rgba(255, 255, 255, 0.9); border: 1px solid #e2e8f0;
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: #94a3b8; font-size: 12px; cursor: pointer;
    opacity: 0; transition: all 0.2s; z-index: 10;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    
    &:hover { color: #e74c3c; border-color: #fca5a5; background: #fef2f2; }
  }

  &:hover .delete-visual-btn { opacity: 1; }

  .mock-img { 
    height: 80px; background: #f1f5f9; border-radius: 8px; margin-bottom: 12px; 
    display: flex; align-items: center; justify-content: center; 
    font-size: 24px; color: #0ea5a4; 
    position: relative; overflow: hidden;
  }
  .mini-visual {
    width: 78%;
    height: 56px;
    color: #0ea5a4;
  }
  .mini-visual.chart {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 8px;
  }
  .mini-visual.chart span {
    width: 16%;
    border-radius: 6px 6px 2px 2px;
    background: #0ea5a4;
  }
  .mini-visual.table {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 5px;
  }
  .mini-visual.table span {
    border-radius: 4px;
    background: #d9eeee;
  }
  .mini-visual.table span:nth-child(-n + 3) {
    background: #0ea5a4;
  }
  .mini-visual.graph {
    position: relative;
  }
  .mini-visual.graph::before {
    content: '';
    position: absolute;
    left: 7%;
    right: 7%;
    top: 50%;
    height: 3px;
    border-radius: 999px;
    background: linear-gradient(135deg, transparent 0 18%, #0ea5a4 18% 28%, transparent 28% 42%, #0ea5a4 42% 55%, transparent 55% 68%, #0ea5a4 68% 100%);
    transform: rotate(-10deg);
  }
  .mini-visual.graph i {
    position: absolute;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #0ea5a4;
  }
  .mini-visual.graph i:nth-child(1) { left: 9%; bottom: 18%; }
  .mini-visual.graph i:nth-child(2) { left: 34%; top: 18%; }
  .mini-visual.graph i:nth-child(3) { left: 58%; bottom: 30%; }
  .mini-visual.graph i:nth-child(4) { right: 10%; top: 12%; }
  h4 { margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #1e293b; }
  span { font-size: 11.5px; color: #94a3b8; font-weight: 600; }
`;

export const ProjectGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

export const ProjectCard = styled.div<{ $shared?: boolean }>`
  background: ${(props) => (props.$shared ? '#f8fbff' : '#ffffff')};
  border: 1px solid ${(props) => (props.$shared ? '#bfdbfe' : '#e2e8f0')};
  border-left: 5px solid ${(props) => (props.$shared ? '#3b82f6' : '#e2e8f0')};
  border-radius: 12px; padding: 24px;
  display: flex; flex-direction: column; position: relative; min-height: 204px; box-sizing: border-box;
  cursor: pointer; transition: all 0.2s ease-in-out;
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${(props) => (props.$shared ? '0 12px 22px rgba(59, 130, 246, 0.11)' : '0 10px 15px -3px rgba(0, 0, 0, 0.04)')};
    border-color: ${(props) => (props.$shared ? '#93c5fd' : '#cbd5e1')};
  }
  
  .tag { align-self: flex-start; background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 12px; margin-bottom: 12px; &.hwp { background: #e6f4f4; color: #0ea5a4; } &.shared { background: #dbeafe; color: #2563eb; } }
  h3 { font-size: 16px; font-weight: 800; color: #1e293b; margin: 0 0 6px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80%; }
  .title-input { font-size: 16px; font-weight: 800; color: #1e293b; margin: 0 0 6px 0; padding: 2px 6px; border: 1px solid #0ea5a4; border-radius: 4px; outline: none; width: 80%; box-sizing: border-box; font-family: inherit; background: #f8fafc; }
  .date { font-size: 11px; color: #94a3b8; font-weight: 700; margin-bottom: auto; }
  .invite-code {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: 8px;
    margin: 10px 0 4px 0;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    background: #ffffff;
    padding: 0;
    cursor: copy;
  }

  .invite-code:hover {
    border-color: #0ea5a4;
  }
  .invite-code span {
    align-self: stretch;
    display: inline-flex;
    align-items: center;
    padding: 5px 8px;
    background: #f1f5f9;
    color: #64748b;
    font-size: 10.5px;
    font-weight: 800;
  }
  .invite-code strong {
    padding-right: 9px;
    color: #0f172a;
    font-family: monospace;
    font-size: 12px;
    font-weight: 800;
  }
  .card-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 12px; margin-top: 12px; }
  .meta-info { display: flex; align-items: center; gap: 12px; font-size: 12px; color: #64748b; font-weight: 700; i { color: #94a3b8; } }
  .action-btns { display: flex; gap: 10px; button { background: none; border: none; font-size: 15px; color: #94a3b8; cursor: pointer; transition: color 0.1s; &.edit-icon-btn:hover { color: #1e293b; } &.delete-icon-btn:hover { color: #e74c3c; } } }
  .profile-thumbnail { position: absolute; right: 24px; top: 24px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: transparent; i { font-size: 32px; color: ${(props) => (props.$shared ? '#60a5fa' : palette.slate[4])}; } }

  @media (max-width: 560px) {
    height: auto;
    min-height: 172px;
    padding: 20px;

    h3 {
      white-space: normal;
      max-width: calc(100% - 44px);
      line-height: 1.35;
    }

    .card-footer {
      align-items: flex-start;
      gap: 10px;
    }

    .meta-info {
      flex-wrap: wrap;
      gap: 8px;
    }
  }
`;

export const EmptyCard = styled.div`
  background: #ffffff; border: 2px dashed #cbd5e1; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 180px; cursor: pointer; color: #94a3b8; font-weight: 700; font-size: 13.5px; gap: 6px; box-sizing: border-box; transition: all 0.2s ease-in-out;
  &:hover { transform: translateY(-2px); border-color: #0ea5a4; color: #0ea5a4; }

  @media (max-width: 560px) {
    height: 140px;
  }
`;

export const ModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(2px);
  display: flex; justify-content: center; align-items: center; z-index: 900;
`;

export const ModalContent = styled.div`
  background: #ffffff; width: min(800px, calc(100vw - 32px)); max-height: 85vh; border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); display: flex; flex-direction: column; overflow: hidden;
  .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 24px 32px; border-bottom: 1px solid #e2e8f0; h3 { margin: 0; font-size: 20px; font-weight: 800; color: #1e293b; } button { background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer; transition: 0.15s; &:hover { color: #1e293b; } } }
  .modal-body { padding: 32px; overflow-y: auto; flex: 1; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; }

  @media (max-width: 560px) {
    border-radius: 12px;

    .modal-header {
      padding: 18px;
      h3 { font-size: 17px; }
    }

    .modal-body {
      padding: 18px;
      gap: 14px;
    }
  }
`;

export const DrawerBackdrop = styled.div<{ $show?: boolean }>`
  position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.15); backdrop-filter: blur(1px); display: ${props => props.$show ? 'block' : 'none'}; z-index: 1000;
`;

export const DrawerContainer = styled.div<{ $show?: boolean }>`
  position: fixed; top: 0; right: ${props => props.$show ? '0' : '-460px'}; width: min(420px, 100vw); height: 100vh; background: #ffffff; box-shadow: -10px 0 30px -5px rgba(0, 0, 0, 0.08); border-left: 1px solid #e2e8f0; z-index: 1001; transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1); padding: 40px 32px; box-sizing: border-box; display: flex; flex-direction: column;
  .drawer-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; .title-wrap { h3 { font-size: 18px; font-weight: 800; color: #1e293b; margin: 0 0 6px 0; } span { font-size: 12px; color: #94a3b8; font-weight: 600; } } .close-btn { background: none; border: none; font-size: 18px; color: #94a3b8; cursor: pointer; &:hover { color: #1e293b; } } }
  .drawer-body { flex: 1; overflow-y: auto; .visual-preview { position: relative; overflow: hidden; width: 100%; height: 180px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px; display: flex; align-items: center; justify-content: center; color: #0ea5a4; .mini-visual { width: 70%; height: 120px; } .mini-visual.chart { display: flex; align-items: flex-end; justify-content: center; gap: 16px; } .mini-visual.chart span { width: 18%; border-radius: 10px 10px 2px 2px; background: #0ea5a4; } .mini-visual.table { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; } .mini-visual.table span { border-radius: 5px; background: #d9eeee; } .mini-visual.table span:nth-child(-n + 3) { background: #0ea5a4; } .mini-visual.graph { position: relative; } .mini-visual.graph::before { content: ''; position: absolute; left: 8%; right: 8%; top: 48%; height: 4px; border-radius: 999px; background: linear-gradient(135deg, transparent 0 18%, #0ea5a4 18% 28%, transparent 28% 42%, #0ea5a4 42% 55%, transparent 55% 68%, #0ea5a4 68% 100%); transform: rotate(-10deg); } .mini-visual.graph i { position: absolute; width: 12px; height: 12px; border-radius: 50%; background: #0ea5a4; } .mini-visual.graph i:nth-child(1) { left: 9%; bottom: 20%; } .mini-visual.graph i:nth-child(2) { left: 34%; top: 18%; } .mini-visual.graph i:nth-child(3) { left: 58%; bottom: 30%; } .mini-visual.graph i:nth-child(4) { right: 10%; top: 12%; } } .info-section { margin-bottom: 24px; h5 { font-size: 13px; font-weight: 800; color: #475569; margin: 0 0 8px 0; } p { font-size: 13.5px; color: #334155; line-height: 1.6; margin: 0; font-weight: 500; } } .details-list { background: #f8fafc; border-radius: 8px; padding: 16px; margin-top: 16px; display: flex; flex-direction: column; gap: 12px; .detail-item { display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 600; .lbl { color: #64748b; } .val { color: #1e293b; font-weight: 700; } } } }
  .drawer-footer { margin-top: auto; padding-top: 20px; border-top: 1px solid #f1f5f9; display: grid; gap: 8px; .action-btn { width: 100%; background: #1e293b; color: white; border: none; padding: 12px; border-radius: 8px; font-size: 13.5px; font-weight: 700; cursor: pointer; &:hover { background: #0f172a; } } }

  @media (max-width: 560px) {
    padding: 28px 20px;
  }
`;
