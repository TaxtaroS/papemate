// TypeScript 변경 표시: JSX가 들어 있는 React 파일이라 .js에서 .tsx로 바꾼 파일입니다.
// TypeScript 변경 표시: 기존 JS 로직은 유지하면서 함수 인자와 화면 props에 실제 타입을 붙여 TypeScript 검사를 통과하게 했습니다.
// 초보자 안내: 사용자가 실제로 보게 되는 한 화면 단위의 React 페이지 컴포넌트입니다.

import React from 'react';
import {
  ChartPlaceholder,
  PageContainer,
  StatCard,
  StatRow,
} from './styles/Dashbord.styles';

function DashbordC() {
  return (
    <PageContainer>
      <h3>종합 대시보드</h3>

      <StatRow>
        <StatCard>
          <div className="label">분석된 총 논문 수</div>
          <div className="value">0개 문서</div>
          <div className="trend">분석 완료 후 집계됩니다.</div>
        </StatCard>
        <StatCard>
          <div className="label">팀 프로젝트 공간</div>
          <div className="value">0개 공간</div>
          <div className="trend blue">프로젝트 등록 후 표시됩니다.</div>
        </StatCard>
        <StatCard>
          <div className="label">AI 질문 호출 수</div>
          <div className="value">0회</div>
          <div className="trend">질문 입력 후 집계됩니다.</div>
        </StatCard>
      </StatRow>

      <ChartPlaceholder>
        <div className="chart-title">문서 유형별 업로드 비율</div>
        <div className="empty-chart">업로드된 문서가 없습니다.</div>
      </ChartPlaceholder>
    </PageContainer>
  );
}

export default DashbordC;
