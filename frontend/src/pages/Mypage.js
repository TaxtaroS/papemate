import React from 'react';
import {
  MypageWrapper,
  LeftProfileSection,
  RightContentSection,
  VisualBoxContainer,
  VisualCard,
  HistoryList
} from './styles/Mypage.styles';

function MypageC({ onLogoutClick }) {
  return (
    <MypageWrapper>
      <LeftProfileSection>
        <div className="avatar-circle">
          <i className="fa-regular fa-circle-user"></i>
        </div>
        <div className="user-id">user14530</div>

        <div className="action-btn">프로필 수정</div>
        <div className="action-btn">비밀번호 변경</div>

        <div className="stats-grid">
          <div className="stat-card"><div className="val">0</div><div className="lbl">프로젝트</div></div>
          <div className="stat-card"><div className="val">0</div><div className="lbl">분석 질문</div></div>
          <div className="stat-card"><div className="val">0</div><div className="lbl">자료</div></div>
          <div className="stat-card"><div className="val">0</div><div className="lbl">참여 팀</div></div>
        </div>

        <div className="bottom-btn-group">
          <div className="logout-btn" onClick={onLogoutClick}>로그아웃</div>
          <div className="withdraw-btn">회원탈퇴</div>
        </div>
      </LeftProfileSection>

      <RightContentSection>
        <div className="section-title-row">
          <h3>저장된 시각화 보관함</h3>
          <button>전체 보기</button>
        </div>
        <VisualBoxContainer>
          <VisualCard>
            <div className="mock-img"><i className="fa-regular fa-folder-open"></i></div>
            <h4>저장된 시각화가 없습니다.</h4>
            <span>분석.요약에서 프로젝트를 등록해보세요.</span>
          </VisualCard>
        </VisualBoxContainer>

        <div className="section-title-row">
          <h3>최근 분석 히스토리</h3>
          <button>전체 보기</button>
        </div>
        <HistoryList>
          <div className="history-item">
            <div className="title-side"><i className="fa-solid fa-file-lines"></i> 최근 분석 히스토리가 없습니다.</div>
            <div className="date-side">-</div>
          </div>
        </HistoryList>
      </RightContentSection>
    </MypageWrapper>
  );
}

export default MypageC;
