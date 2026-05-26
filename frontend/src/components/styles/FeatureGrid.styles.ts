// 초보자 안내: styled-components로 화면의 색상, 간격, 배치 같은 스타일을 정의하는 파일입니다.

import styled from 'styled-components';

export const GridSection = styled.section`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  max-width: 800px;
  width: 100%;
  margin: 0 auto 40px auto;
  box-sizing: border-box;
`;

export const FeatureCard = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  box-shadow: none;
  text-align: left;
  box-sizing: border-box;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
    border-color: #cbd5e1;
  }

  .icon-wrap {
    font-size: 20px;
    color: #0ea5a4;
    background: #e6f4f4;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    flex-shrink: 0;
  }

  h3 {
    font-size: 15px;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 6px 0;
  }

  p {
    font-size: 12.5px;
    color: #64748b;
    margin: 0;
    line-height: 1.5;
  }
`;
