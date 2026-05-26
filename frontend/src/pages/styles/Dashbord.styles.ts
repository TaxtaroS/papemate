// 초보자 안내: styled-components로 화면의 색상, 간격, 배치 같은 스타일을 정의하는 파일입니다.

import styled from 'styled-components';

/* Dashbord 페이지 전용 스타일입니다.
   대시보드가 처음 갖고 있던 통계 카드와 문서 유형 차트 모양만 유지합니다. */

export const PageContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  text-align: left;

  h3 {
    margin: 0;
    color: #2d3748;
    font-size: 20px;
    font-weight: 700;
  }
`;

export const StatRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

export const StatCard = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px;
  box-shadow: none;
  transition: all 0.15s ease-in-out;

  &:hover {
    border-color: #cbd5e1;
  }

  .label {
    margin-bottom: 8px;
    color: #94a3b8;
    font-size: 12.5px;
    font-weight: 700;
  }

  .value {
    color: #1e293b;
    font-size: 28px;
    font-weight: 800;
    line-height: 1.2;
  }

  .trend {
    margin-top: 6px;
    color: #0ea5a4;
    font-size: 12px;
    font-weight: 700;
  }

  .trend.blue {
    color: #3182ce;
  }
`;

export const ChartPlaceholder = styled.div`
  flex: 1;
  min-height: 200px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #64748b;

  .chart-title {
    align-self: flex-start;
    margin-bottom: 16px;
    color: #2d3748;
    font-size: 15px;
    font-weight: 700;
  }

  .mock-chart {
    width: 100%;
    height: 120px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 24px;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 4px;
  }

  .empty-chart {
    width: 100%;
    border: 1px dashed #cbd5e1;
    border-radius: 8px;
    padding: 34px 20px;
    color: #94a3b8;
    font-size: 13px;
    font-weight: 700;
    text-align: center;
  }

  .bar {
    width: 44px;
    background: #e6f4f4;
    border-radius: 6px 6px 0 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #0ea5a4;
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
  }

  .bar:hover {
    background: #0ea5a4;
    color: white;
    transform: scaleY(1.03);
    transform-origin: bottom;
  }

  .pdf {
    height: 80%;
  }

  .hwpx {
    height: 60%;
  }

  .hwp {
    height: 35%;
  }

  .txt {
    height: 20%;
  }

  @media (max-width: 760px) {
    .mock-chart {
      gap: 14px;
    }

    .bar {
      width: 36px;
    }
  }
`;
