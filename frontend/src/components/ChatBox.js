import React from 'react';
import styled from 'styled-components';
import { palette } from '../shared/palette';

const ChatBoxWrapper = styled.div`
  max-width: 760px; width: 100%; margin: 0 auto;
`;

/* 🎨 업로드된 파일 태그 디자인 구역 */
const UploadedFilesWrapper = styled.div`
  display: flex; 
  justify-content: flex-start;          /* 💡 기획안의 왼쪽 정렬 흐름에 맞추려면 center -> flex-start 변경 추천 */
  gap: 10px;                            /* 💡 사이 간격을 12px에서 10px로 살짝 조밀하게 조정 */
  margin-bottom: 16px;                  /* 💡 인풋창과의 세로 여백을 좀 더 확보 */
  width: 100%;

  .file-tag {
    display: flex; align-items: center; gap: 6px; 
    background: #f1f5f9;                /* 💡 기존 #e2e8f0보다 한 톤 더 밝고 부드러운 회색조(Slate 100) 적용 */
    border: 1px solid #e2e8f0;          /* 💡 기획안 특유의 얇은 외곽선 테두리 추가 */
    padding: 6px 12px; 
    border-radius: 20px;                /* 💡 알약 형태의 둥근 캡슐 느낌을 주기 위해 8px -> 20px로 변경 */
    font-size: 12px;                    /* 💡 본문 텍스트보다 살짝 작고 밀도 있게 변경 (14px -> 12px) */
    font-weight: 700;                   /* 💡 폰트 두께를 더 주어 가시성 확보 */
    color: #475569;                     /* 💡 텍스트 컬러 Slate 600 계열로 매칭 */
    
    /* 확장자별 아이콘 시그니처 컬러 */
    i.fa-file-pdf { color: #e74c3c; }   /* 💡 PDF 전용 브라이트 레드 */
    i.fa-file-lines { color: #3498db; } /* 💡 HWP/HWPX 전용 시원한 블루 */
    
    /* 태그 우측 X 삭제 단추 */
    .file-close { 
      border: none; background: none; cursor: pointer; 
      color: ${palette.red[6]}; padding: 0; 
      font-size: 10px;                  /* 💡 엑스마크가 너무 튀지 않게 크기 살짝 다운 */
      margin-left: 4px;
      &:hover { color: ${palette.red[8]};  } 
    }
  }
`;

/* 🎨 하단 검색/채팅 인풋 바 디자인 구역 */
const ChatInputRow = styled.section`
  display: flex; align-items: center; 
  background: white; 
  border: 2px solid #e2e8f0;            /* 💡 기획안의 선명한 경계선을 위해 두께 상향 (1.5px -> 2px) */
  border-radius: 16px;                  /* 💡 둥글기 값을 메인 카드 피처와 동일하게 16px로 통일 */
  padding: 0 16px;                      /* 💡 양옆 여백을 20px에서 16px로 조절하여 컴팩트하게 정렬 */
  height: 54px; gap: 14px; 
  box-shadow: none;                     /* 💡 기획서의 플랫하고 모던한 플랫 스타일에 맞춰 그림자 제거 혹은 유지 */
  
  /* 실제 텍스트 입력창 */
  .chat-input { 
    flex: 1; border: none; outline: none; 
    font-size: 14px;                    /* 💡 플레이스홀더 서체 가독성 매칭 (15px -> 14px) */
    font-weight: 600;                   /* 💡 타이핑 시 텍스트가 힘 있어 보이도록 두께 추가 */
    color: #1e293b; 
    &::placeholder { color: #94a3b8; }   /* 💡 안내 문구 색상을 차분한 힌트 톤으로 커스텀 */
  }
  
  /* 좌측 플러스(+) 버튼 및 우측 전송(비행기) 버튼 */
  .plus-btn, .send-btn { 
    border: none; background: none; 
    font-size: 18px;                    /* 💡 아이콘 크기 밸런스 조정 */
    cursor: pointer; 
    color: #94a3b8;                     /* 💡 기본 아이콘 색상을 부드러운 Slate 400으로 통일 */
    transition: color 0.15s ease;
    
    &:hover { 
      color: #0ea5a4;                   /* 💡 마우스 올렸을 때 메인 포인트 컬러(#0ea5a4)로 점등 효과 */
    } 
  }
  
  /* 💡 플러스 버튼 전용 마진 보정 (필요시 사용) */
  .plus-btn {
    margin-right: -2px;
  }
`;

function ChatBox() {
  return (
    <ChatBoxWrapper>
      <UploadedFilesWrapper />

      <ChatInputRow>
        <button className="plus-btn"><i className="fa-solid fa-plus"></i></button>
        <input className="chat-input" placeholder="여기에 논문 분석 질문을 입력하세요..." />
        <button className="send-btn"><i className="fa-regular fa-paper-plane"></i></button>
      </ChatInputRow>
    </ChatBoxWrapper>
  );
}

export default ChatBox;
