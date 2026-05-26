// @ts-nocheck
// 초보자 안내: 화면에서 재사용되는 UI 조각을 정의한 React 컴포넌트 파일입니다.

import React from 'react';
import { FeatureCard, GridSection } from './styles/FeatureGrid.styles';

function FeatureGrid() {
  return (
    <GridSection>
      <FeatureCard>
        <div className="icon-wrap"><i className="fa-solid fa-file-invoice"></i></div>
        <div>
          <h3>문서 분석 · 요약</h3>
          <p>HWP, HWPX, PDF 문서의 핵심 내용을 추출하고 요약합니다.</p>
        </div>
      </FeatureCard>

      <FeatureCard>
        <div className="icon-wrap"><i className="fa-solid fa-copy"></i></div>
        <div>
          <h3>다중문서 비교</h3>
          <p>여러 문서를 비교하고 차이점을 시각화합니다.</p>
        </div>
      </FeatureCard>

      <FeatureCard>
        <div className="icon-wrap"><i className="fa-solid fa-chart-bar"></i></div>
        <div>
          <h3>데이터 시각화</h3>
          <p>문서 속 데이터를 차트와 그래프로 변환합니다.</p>
        </div>
      </FeatureCard>

      <FeatureCard>
        <div className="icon-wrap"><i className="fa-solid fa-user-group"></i></div>
        <div>
          <h3>작업공간</h3>
          <p>초대 코드로 팀원을 초대하고 분석 결과를 함께 검토합니다.</p>
        </div>
      </FeatureCard>
    </GridSection>
  );
}

export default FeatureGrid;
