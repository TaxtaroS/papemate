// 초보자 안내: styled-components로 화면의 색상, 간격, 배치 같은 스타일을 정의하는 파일입니다.

import styled from 'styled-components';
import { palette } from '../../shared/palette';

export const ChatBoxWrapper = styled.div`
  max-width: 760px;
  width: 100%;
  margin: 0 auto;
`;

export const UploadedFilesWrapper = styled.div`
  display: flex;
  justify-content: flex-start;
  gap: 10px;
  margin-bottom: 16px;
  width: 100%;

  .file-tag {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    color: #475569;
  }

  i.fa-file-pdf {
    color: #e74c3c;
  }

  i.fa-file-lines {
    color: #3498db;
  }

  .file-close {
    border: none;
    background: none;
    cursor: pointer;
    color: ${palette.red[6]};
    padding: 0;
    font-size: 10px;
    margin-left: 4px;
  }

  .file-close:hover {
    color: ${palette.red[8]};
  }
`;

export const ChatInputRow = styled.section`
  display: flex;
  align-items: center;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  padding: 0 16px;
  height: 54px;
  gap: 14px;
  box-shadow: none;

  .chat-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
  }

  .chat-input::placeholder {
    color: #94a3b8;
  }

  .plus-btn,
  .send-btn {
    border: none;
    background: none;
    font-size: 18px;
    cursor: pointer;
    color: #94a3b8;
    transition: color 0.15s ease;
  }

  .plus-btn:hover,
  .send-btn:hover {
    color: #0ea5a4;
  }

  .plus-btn {
    margin-right: -2px;
  }
`;
