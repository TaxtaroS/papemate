// 초보자 안내: styled-components로 화면의 색상, 간격, 배치 같은 스타일을 정의하는 파일입니다.

import styled from 'styled-components';
import { palette } from '../../shared/palette';

export const ModalOverlay = styled.div<{ $show?: boolean }>`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.32);
  display: ${(props) => (props.$show ? 'flex' : 'none')};
  justify-content: center;
  align-items: center;
  z-index: 999;
  backdrop-filter: blur(2px);
  padding: 16px;
  box-sizing: border-box;
`;

export const CloseIconButton = styled.button`
  position: absolute;
  top: 18px;
  right: 22px;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  color: ${palette.red[6]};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  svg {
    width: 19px;
    height: 19px;
    stroke-width: 3;
  }
`;

export const RecommendBox = styled.div`
  width: min(340px, 100%);
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05);
  border: 1px solid ${palette.slate[2]};
  position: relative;
`;

export const RecommendHeader = styled.div`
  background: #f7fbef;
  border-bottom: 1px solid ${palette.slate[2]};
  padding: 24px 24px 20px;
  display: flex;
  align-items: center;
  justify-content: center;

  .brand-logo {
    width: 180px;
    height: 72px;
    object-fit: contain;
    display: block;
  }
`;

export const RecommendBody = styled.div`
  padding: 32px 24px;
  text-align: center;

  h3 {
    font-size: 18px;
    font-weight: 800;
    color: ${palette.slate[8]};
    margin: 0 0 12px 0;
  }

  p {
    font-size: 12.5px;
    color: ${palette.slate[5]};
    font-weight: 600;
    line-height: 1.6;
    margin: 0 0 28px 0;
  }

  .auth-links {
    display: flex;
    justify-content: center;
    gap: 28px;
    font-size: 14px;
    font-weight: 700;
    color: ${palette.slate[6]};
  }

  .auth-links span {
    cursor: pointer;
    transition: color 0.15s;
  }

  .auth-links span:hover {
    color: ${palette.teal[5]};
  }
`;

export const FigAuthBox = styled.div`
  width: min(420px, 100%);
  max-height: calc(100vh - 32px);
  overflow: hidden;
  background: white;
  border-radius: 16px;
  padding: 34px 36px 26px 36px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
  border: 1px solid ${palette.slate[2]};
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;

  .popup-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
  }

  .popup-logo-image {
    width: 196px;
    height: 78px;
    object-fit: contain;
    display: block;
  }

  .popup-title {
    font-size: 19px;
    font-weight: 800;
    color: #343a40;
    text-align: center;
    margin: 0 0 18px 0;
  }

  .social-stack {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 18px;
  }

  .social-btn {
    width: 100%;
    height: 46px;
    border: none;
    border-radius: 8px;
    display: grid;
    grid-template-columns: 44px 1fr 44px;
    align-items: center;
    padding: 0 14px;
    font-size: 15px;
    font-weight: 800;
    cursor: pointer;
  }

  .social-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .google-signin-slot {
    width: 100%;
    min-height: 46px;
    display: flex;
    justify-content: center;
  }

  .google-signin-slot > div {
    width: 100% !important;
  }

  .social-btn svg {
    width: 22px;
    height: 22px;
    justify-self: start;
  }

  .social-btn.google {
    background: #1f7ae5;
    color: #ffffff;
  }

  .social-btn.kakao {
    background: #ffe500;
    color: #181600;
  }

  .social-btn.naver {
    background: #08c861;
    color: #ffffff;
  }

  .divider {
    display: flex;
    align-items: center;
    gap: 14px;
    color: #c4cbd3;
    font-size: 13px;
    font-weight: 800;
    margin-bottom: 16px;
  }

  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e5e7eb;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }

  .input-group input {
    width: 100%;
    height: 45px;
    padding: 0 16px;
    border: 1px solid #d8dde4;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 700;
    color: ${palette.slate[8]};
    outline: none;
    box-sizing: border-box;
  }

  .input-group input::placeholder {
    color: #c4cbd3;
  }

  .action-row {
    display: flex;
    width: 100%;
    margin-top: 18px;
    margin-bottom: 18px;
  }

  .continue-btn {
    width: 100%;
    height: 48px;
    background: #343a40;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 800;
    cursor: pointer;
    transition: background 0.15s;
  }

  .continue-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .toggle-guide {
    font-size: 14px;
    color: #aeb6bf;
    font-weight: 800;
    text-align: center;
    width: 100%;
    margin: 0;
  }

  .toggle-guide button {
    background: none;
    border: none;
    color: ${palette.teal[5]};
    cursor: pointer;
    font-weight: 800;
    margin-left: 8px;
    font-size: 14px;
  }

  .auth-error {
    color: ${palette.red[6]};
    font-size: 13px;
    font-weight: 700;
    text-align: center;
    margin: -12px 0 18px 0;
  }

  @media (max-height: 760px) {
    padding-top: 24px;
    padding-bottom: 20px;

    .popup-logo {
      margin-bottom: 14px;
    }

    .popup-logo-image {
      width: 164px;
      height: 64px;
    }

    .social-btn {
      height: 42px;
    }

    .input-group input {
      height: 42px;
    }

    .continue-btn {
      height: 44px;
    }
  }
`;
