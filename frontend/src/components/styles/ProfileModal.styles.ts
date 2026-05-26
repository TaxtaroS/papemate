// 초보자 안내: styled-components로 화면의 색상, 간격, 배치 같은 스타일을 정의하는 파일입니다.

import styled from 'styled-components';

export const ProfileModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const ModalContainer = styled.div`
  width: 400px;
  background: white;
  border-radius: 20px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
`;

export const IconWrapper = styled.div`
  font-size: 50px;
  color: #0ea5a4;
  margin-bottom: 10px;
`;

export const ProfileActionButton = styled.button<{ $withMargin?: boolean }>`
  width: 100%;
  padding: 10px;
  background: #0ea5a4;
  color: white;
  border-radius: 8px;
  border: none;
  margin: ${(props) => (props.$withMargin ? '5px 0' : '0')};
`;

export const GridBox = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  width: 100%;
  margin: 20px 0;
`;

export const StatItem = styled.div`
  border: 1px solid #e2e8f0;
  padding: 10px;
  border-radius: 10px;
  text-align: center;
`;

export const FooterButtonRow = styled.div`
  display: flex;
  gap: 10px;
  width: 100%;

  button {
    flex: 1;
    padding: 10px;
  }

  .danger {
    color: red;
  }
`;
