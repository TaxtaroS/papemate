// 초보자 안내: styled-components로 화면의 색상, 간격, 배치 같은 스타일을 정의하는 파일입니다.

import styled from 'styled-components';

/* Analysis 페이지 전용 스타일 모음입니다.
   페이지 컴포넌트에는 화면 흐름과 이벤트 로직만 남기기 위해 styled-components를 이 파일로 분리했습니다. */
export const Container = styled.div`
  display: flex; width: 100%; height: 100vh; background: #ffffff; box-sizing: border-box;

  @media (max-width: 900px) {
    flex-direction: column;
    height: auto;
    min-height: 100vh;
    overflow-y: auto;
  }
`;

export const LeftUploadPanel = styled.div`
  width: 260px; 
  border-right: 1px solid #e2e8f0;      /* 💡 사이드바 경계선과 동일한 슬레이트 라인 적용 */
  background: #f8fafc;                  /* 💡 메인 대시보드 배경과 통일감을 주는 부드러운 화이트 그레이 */
  display: flex; flex-direction: column; padding: 20px; box-sizing: border-box;
  
  /* 문서 업로드 드롭존 구역 */
  .drop-zone {
    border: 2px dashed #cbd5e1; 
    border-radius: 12px; padding: 32px 16px; 
    text-align: center; color: #64748b; /* 💡 텍스트 가독성을 위해 살짝 톤 업 (Slate 500) */
    font-weight: 700; font-size: 12.5px;/* 💡 기획안의 조밀한 서체 스펙 매칭 */
    display: flex; flex-direction: column; align-items: center; gap: 12px; 
    margin-bottom: 24px; 
    background: #ffffff;
    cursor: pointer;
    transition: all 0.15s ease-in-out;

    input {
      display: none;
    }

    span {
      font-size: 11px;
      color: #cbd5e1;
    }

    .drop-error {
      margin: 2px 0 0 0;
      color: #dc2626;
      font-size: 11.5px;
      line-height: 1.45;
      word-break: break-word;
    }

    &:hover {
      background: #f1f5f9;              /* 💡 마우스 올렸을 때 업로드 유도 피드백 */
      border-color: #94a3b8;
    }
    i { font-size: 26px; color: #94a3b8; }
  }

  /* 업로드 완료되어 리스트업된 파일 아이템 카드 */
  .file-item {
    display: flex; align-items: center; gap: 8px; 
    background: white; padding: 12px; 
    border: 1px solid #e2e8f0;          /* 💡 선명하되 과하지 않은 연한 테두리 */
    border-radius: 8px;                 /* 💡 라운드 값 6px에서 8px로 통일감 상향 */
    margin-bottom: 8px; 
    font-size: 12.5px; font-weight: 700; 
    color: #1e293b;                     /* 💡 파일명이 눈에 쏙 들어오도록 다크 슬레이트 지정 */
    box-shadow: none;                   /* 💡 플랫한 UI를 위해 그림자는 깔끔하게 제거 */
    
    span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .size { color: #94a3b8; font-size: 11px; font-weight: 600; }

    button {
      width: 24px;
      height: 24px;
      border: 1px solid #fecaca;
      border-radius: 6px;
      background: #fef2f2;
      color: #dc2626;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex: 0 0 auto;
    }

    &.restored {
      border-style: dashed;
      background: #f8fafc;
    }
  }

  .empty-file {
    border: 1px dashed #cbd5e1;
    border-radius: 8px;
    background: #ffffff;
    padding: 14px 12px;
    color: #94a3b8;
    font-size: 12.5px;
    font-weight: 700;
    text-align: center;
  }

  /* 분석 완료 상태 표시 바 (하단 고정) */
  .status-bar { 
    background: #e6f4f4;                /* 💡 서비스 포인트 컬러와 어울리는 연한 민트/틸 배경 전환 */
    color: #0ea5a4;                     /* 💡 텍스트 색상도 메인 시그니처 틸 컬러로 매칭 */
    padding: 12px; border-radius: 8px; 
    font-size: 12.5px; font-weight: 800; 
    display: flex; align-items: center; justify-content: center; gap: 8px; 
    margin-top: auto; 
    border: 1px solid #bce3e3;
  }

  @media (max-width: 900px) {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
    padding: 16px;
    display: grid;
    grid-template-columns: minmax(180px, 1fr) repeat(3, minmax(150px, 1fr));
    gap: 10px;
    align-items: stretch;

    .drop-zone {
      margin-bottom: 0;
      padding: 18px 12px;
    }

    .file-item {
      margin-bottom: 0;
    }

    .status-bar {
      grid-column: 1 / -1;
      margin-top: 0;
    }
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

export const MainQAEngine = styled.div`
  flex: 1; display: flex; flex-direction: column; height: 100vh; background: #ffffff;

  @media (max-width: 900px) {
    height: auto;
    min-height: 70vh;
  }
`;

export const TopMenuBar = styled.div`
  padding: 18px 32px;                   /* 💡 위아래 여백을 주어 타이틀바 뼈대 안정감 구축 */
  border-bottom: 1px solid #e2e8f0;     /* 💡 라인 컬러 통일 (#f1f5f9 -> #e2e8f0) */
  display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;
  
  h2 { font-size: 18px; font-weight: 800; color: #1e293b; margin: 0; }

  .restore-badge {
    margin-left: 8px;
    background: #e6f7f2;
    color: #2ecc71;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
  }
  
  /* 우측 액션 버튼 군 (프로젝트 저장, 내보내기 등) */
  .actions { 
    display: flex; gap: 8px; align-items: center;

    .api-key-box {
      height: 36px;
      min-width: 330px;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      background: #f8fbff;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 0 9px;
      box-sizing: border-box;

      i {
        color: #2563eb;
        font-size: 12px;
      }

      select {
        height: 24px;
        border: 1px solid #dbeafe;
        border-radius: 5px;
        background: #ffffff;
        color: #2563eb;
        font-size: 11px;
        font-weight: 850;
        outline: none;
      }

      input {
        min-width: 0;
        flex: 1;
        border: none;
        background: transparent;
        outline: none;
        color: #1e293b;
        font-size: 12px;
        font-weight: 750;

        &::placeholder {
          color: #94a3b8;
        }
      }

      .clear-key {
        width: 20px;
        height: 20px;
        border: none;
        border-radius: 5px;
        background: #dbeafe;
        color: #2563eb;
        padding: 0;
        font-size: 13px;
        line-height: 1;
      }
    }

    button { 
      background: #ffffff;              /* 💡 버튼 배경을 흰색으로 전환하여 더 정갈하게 변경 */
      border: 1px solid #cbd5e1; 
      padding: 8px 14px; border-radius: 6px; 
      font-weight: 700; font-size: 13px; 
      cursor: pointer; color: #475569;
      transition: all 0.15s;
      
      &:hover { background: #f8fafc; color: #1e293b; border-color: #94a3b8; }
    } 

    .danger {
      border-color: #e74c3c;
      color: #e74c3c;
    }
  }

  @media (max-width: 680px) {
    align-items: flex-start;
    flex-direction: column;
    padding: 16px 20px;

    .actions {
      width: 100%;
      flex-wrap: wrap;

      button {
        flex: 1;
        min-width: 120px;
      }

      .api-key-box {
        width: 100%;
      }
    }
  }
`;

export const InviteCodeBadge = styled.div`
  min-height: 36px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  cursor: copy;

  &:hover {
    border-color: #0ea5a4;
  }

  span {
    align-self: stretch;
    display: inline-flex;
    align-items: center;
    padding: 0 10px;
    background: #64748b;
    color: #ffffff;
    font-size: 12px;
    font-weight: 800;
  }

  strong {
    min-width: 86px;
    padding: 0 12px;
    color: #0f172a;
    font-family: monospace;
    font-size: 13px;
    text-align: center;
  }

  @media (max-width: 680px) {
    width: 100%;

    strong {
      flex: 1;
    }
  }
`;

export const StreamMessageArea = styled.div`
  flex: 1; padding: 40px 60px;          /* 💡 좌우 여백을 60px로 넓혀서 논문 읽을 때 시야가 답답하지 않게 가로폭 확장 */
  overflow-y: auto; display: flex; flex-direction: column; gap: 28px;

  @media (max-width: 900px) {
    padding: 28px 32px;
  }

  @media (max-width: 560px) {
    padding: 22px 18px;
    gap: 20px;
  }
`;

export const AiRow = styled.div`
  display: flex; gap: 16px;
  
  /* AI 로봇 프로필 원형/사각 아이콘 */
  .ai-icon { 
    width: 36px; height: 36px; border-radius: 8px; 
    background: #e6f4f4; color: #0ea5a4; 
    display: flex; align-items: center; justify-content: center; 
    font-size: 18px; flex-shrink: 0; border: 1px solid #bce3e3; 
  }
  
  /* AI 답변 말풍선 박스 */
  .ai-box { 
    background: #f1f5f9;                /* 💡 차분하고 정돈된 Light Slate 회색 배경 */
    padding: 16px 24px;                 /* 💡 줄글이 가로로 길어지므로 가로 패딩을 24px로 넉넉히 확보 */
    border-radius: 4px 16px 16px 16px;  /* 💡 AI 아이콘 시작점 기준으로 말풍선 모서리 엣지 포인트 부여 */
    color: #1e293b; 
    font-size: 14.5px; 
    font-weight: 600;                   /* 💡 기획서 폰트 두께 스펙 반영 */
    line-height: 1.65;                  /* 💡 논문 분석 데이터 판독 시 줄간격이 꼬이지 않도록 최적화 */
    max-width: 80%; white-space: pre-wrap; 
  }

  @media (max-width: 680px) {
    gap: 10px;

    .ai-icon {
      width: 32px;
      height: 32px;
      font-size: 16px;
    }

    .ai-box {
      max-width: 100%;
      padding: 14px 16px;
      font-size: 13.5px;
    }
  }
`;

export const UserRow = styled.div`
  display: flex; justify-content: flex-end;

  .user-box {
    background: #0ea5a4;
    color: white;
    padding: 14px 22px;
    border-radius: 16px 4px 16px 16px;
    font-size: 14px;
    font-weight: 700;
    max-width: 75%;
    box-shadow: 0 4px 12px rgba(14, 165, 164, 0.15);
  }

  @media (max-width: 680px) {
    .user-box {
      max-width: 92%;
      padding: 12px 16px;
      font-size: 13.5px;
    }
  }
`;

export const LoadingSection = styled.div`
  display: flex; align-items: center; gap: 12px; 
  color: #0ea5a4;                       /* 💡 연동 대기선 색상을 초록색(#2ecc71)에서 브랜드 민트색으로 통일 */
  font-weight: 700; font-size: 15px; 
  padding-left: 52px;                   /* 💡 AI 아이콘 가로선 오프셋 정렬 정밀 세팅 */
  
  .spinner { animation: spin 1.5s linear infinite; font-size: 18px; }
  @keyframes spin { 100% { transform: rotate(360deg); } }

  @media (max-width: 560px) {
    padding-left: 0;
    font-size: 13.5px;
  }
`;

export const BottomPromptInput = styled.div`
  padding: 24px 40px;                   /* 💡 본문 폭(60px)에 자연스럽게 이어지도록 여백 밸런스 상향 */
  border-top: 1px solid #e2e8f0; 
  display: flex; flex-direction: column; gap: 8px; align-items: stretch;

  .file-island-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 0 4px;
  }

  .file-island {
    min-width: 0;
    max-width: min(320px, 100%);
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid #cbd5e1;
    border-radius: 999px;
    background: #f8fafc;
    padding: 6px 7px 6px 11px;
    color: #334155;
    font-size: 12px;
    font-weight: 800;
    box-shadow: 0 3px 10px rgba(15, 23, 42, 0.04);
  }

  .file-island > i {
    color: #0ea5a4;
    font-size: 13px;
    flex: 0 0 auto;
  }

  .file-island span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-island .remove-file {
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 999px;
    background: #fee2e2;
    color: #dc2626;
    font-size: 16px;
    font-weight: 900;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex: 0 0 auto;
  }

  .file-island .remove-file:hover {
    background: #dc2626;
    color: #ffffff;
  }
  
  /* 검색 입력창 주머니 테두리 */
  .input-wrapper {
    width: 100%; box-sizing: border-box;
    flex: 1; display: flex; align-items: center; 
    background: #fff; 
    border: 2px solid #e2e8f0;          /* 💡 채팅창과 똑같은 2px 선명한 경계선으로 수정 */
    border-radius: 14px; padding: 6px 18px;
    transition: border-color 0.15s;
    
    &:focus-within { border-color: #64748b; } /* 💡 마우스 클릭 시 테두리 색상 부드럽게 점등 */
    
    input { 
      flex: 1; border: none; padding: 10px 0; 
      font-size: 14px; font-weight: 600; outline: none; 
      color: #1e293b;
      &::placeholder { color: #94a3b8; }
    }

    button {
      border: none;
      background: transparent;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .clip-upload {
      width: 34px;
      height: 34px;
      margin-right: 8px;
      border-radius: 9px;
      color: #64748b;
      flex: 0 0 auto;

      &:hover {
        background: #f1f5f9;
        color: #0ea5a4;
      }
    }

    i { 
      color: #94a3b8; font-size: 18px; cursor: pointer; 
      transition: color 0.15s;
      &:hover { color: #0ea5a4; }       /* 💡 전송 종이비행기 아이콘 호버 시 민트색으로 전환 */
    }
  }

  @media (max-width: 560px) {
    padding: 16px;

    .file-island {
      max-width: 100%;
    }

    .input-wrapper {
      border-radius: 12px;
      padding: 6px 12px;
    }
  }
`;

export const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.32);
  padding: 18px;
`;

export const ChartSaveModal = styled.div`
  width: min(420px, 100%);
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.2);
  overflow: hidden;

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px;
    border-bottom: 1px solid #e2e8f0;
  }

  h3 {
    margin: 0;
    color: #0f172a;
    font-size: 18px;
    font-weight: 850;
  }

  .modal-header button {
    width: 30px;
    height: 30px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #ffffff;
    color: #475569;
    font-size: 18px;
    font-weight: 850;
    cursor: pointer;
  }

  p {
    margin: 0;
    padding: 18px 20px 4px 20px;
    color: #64748b;
    font-size: 13px;
    font-weight: 650;
    line-height: 1.55;
  }

  .modal-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 16px 20px 20px 20px;
  }

  .modal-actions button,
  .modal-footer button {
    min-height: 40px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 850;
    cursor: pointer;
  }

  .modal-actions button {
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #475569;
  }

  .modal-footer {
    display: flex;
    gap: 10px;
    padding: 16px 20px;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
  }

  .modal-footer button {
    flex: 1;
  }

  .secondary {
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #475569;
  }

  .primary {
    border: none;
    background: #0ea5a4;
    color: #ffffff;
  }

  @media (max-width: 420px) {
    .modal-actions,
    .modal-footer {
      grid-template-columns: 1fr;
      flex-direction: column;
    }
  }
`;
