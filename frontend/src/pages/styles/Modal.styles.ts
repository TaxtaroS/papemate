// 초보자 안내: styled-components로 화면의 색상, 간격, 배치 같은 스타일을 정의하는 파일입니다.

import styled from 'styled-components';

export const ModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
`;

export const ModalContent = styled.div`
  background: white; padding: 32px; border-radius: 12px;
  width: min(400px, calc(100vw - 32px)); box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  position: relative;
  box-sizing: border-box;

  h3 { margin: 0 0 20px 0; color: #1e293b; }

  input {
    width: 100%;
    padding: 10px 12px;
    margin-bottom: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    box-sizing: border-box;
  }

  .icon-close {
    position: absolute;
    top: 14px;
    right: 14px;
    border: none;
    background: transparent;
    color: #64748b;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .icon-close svg {
    width: 18px;
    height: 18px;
  }

  .field-label {
    display: block;
    font-size: 12px;
    font-weight: 800;
    color: #475569;
    margin-bottom: 6px;
  }

  .profile-preview {
    width: 88px;
    height: 88px;
    border-radius: 50%;
    background: #f1f5f9;
    color: #94a3b8;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px auto;
    overflow: hidden;
  }

  .profile-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .profile-preview svg {
    width: 42px;
    height: 42px;
  }

  .profile-actions {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 18px;
  }

  .file-btn,
  .ghost-btn {
    min-height: 36px;
    padding: 0 12px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #475569;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
  }

  .file-btn input {
    display: none;
  }

  .modal-error {
    color: #dc2626;
    font-size: 12.5px;
    font-weight: 700;
    margin: 0 0 14px 0;
  }
`;

export const ButtonGroup = styled.div`
  display: flex; gap: 10px; justify-content: flex-end;
  button { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 700; }
  button:disabled { opacity: 0.65; cursor: not-allowed; }
  .save { background: #0ea5a4; color: white; }
  .cancel { background: #f1f5f9; color: #475569; }
`;
