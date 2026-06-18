// TypeScript 변경 표시: JSX가 들어 있는 React 파일이라 .js에서 .tsx로 바꾼 파일입니다.
// TypeScript 변경 표시: 기존 JS 로직은 유지하면서 함수 인자와 화면 props에 실제 타입을 붙여 TypeScript 검사를 통과하게 했습니다.
// 초보자 안내: 화면에서 재사용되는 UI 조각을 정의한 React 컴포넌트 파일입니다.

import React from 'react';
import {
  ChatBoxWrapper,
  ChatInputRow,
  UploadedFilesWrapper,
} from './styles/ChatBox.styles';

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
