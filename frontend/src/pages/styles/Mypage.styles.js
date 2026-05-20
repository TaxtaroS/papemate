import styled from 'styled-components';
import { palette } from '../../shared/palette';

/* Mypage 페이지 전용 스타일 모음입니다.
   페이지 컴포넌트에는 화면 흐름과 이벤트 로직만 남기기 위해 styled-components를 이 파일로 분리했습니다. */
export const MypageWrapper = styled.div`
  display: flex; width: 100%; height: 100vh; background: #ffffff; box-sizing: border-box;

  @media (max-width: 900px) {
    flex-direction: column;
    height: auto;
    min-height: 100vh;
  }
`;

export const LeftProfileSection = styled.div`
  width: 260px;                         /* 💡 다른 패널들과 규격을 맞춰 240px에서 260px로 소폭 확장 */
  background: #f8fafc;                  /* 💡 이질감이 들던 기존 연초록 배경을 메인 테마인 부드러운 Slate 50 톤으로 전면 교체 */
  border-right: 1px solid #e2e8f0;      /* 💡 외곽선 실선 컬러를 시스템 공통 슬레이트 라인으로 변경 */
  display: flex; flex-direction: column; align-items: center; padding: 40px 20px; box-sizing: border-box;
  
  /* 대형 원형 유저 아바타 영역 (Account Circle 완벽 패밀리 룩 스펙) */
  .avatar-circle { 
    width: 100px; height: 100px;        /* 💡 밸런스를 위해 110px에서 100px로 컴팩트화 */
    border-radius: 50%; 
    background: transparent; display: flex; align-items: center; justify-content: center; 
    margin-bottom: 16px; 
    
    i {
      font-size: 100px;                 /* 💡 서클 영역에 꽉 차도록 100px 폰트 크기 지정 */
      color: ${palette.slate[5]};         /* 💡 시스템 공통 기본 프로필 톤 유지 */
    }
  }
  
  /* 유저 아이디 타이틀 (user14530 등) */
  .user-id { 
    font-size: 20px;                    /* 💡 타이틀 가독성을 위해 24px에서 20px로 단정하게 보정 */
    font-weight: 800; color: #1e293b; margin-bottom: 24px; 
  }
  
  /* 프로필 수정 등 주요 액션 버튼 */
  .action-btn { 
    width: 100%; background: white; 
    border: 1px solid #cbd5e1;          /* 💡 연초록 테두리(#badfba)를 차분한 기본 테두리 실선으로 수정 */
    padding: 10px; border-radius: 6px; 
    font-weight: 700; font-size: 13px; 
    color: #475569; cursor: pointer; margin-bottom: 12px; text-align: center; 
    transition: all 0.15s;
    box-sizing: border-box;
    &:hover { background: #f8fafc; border-color: #94a3b8; color: #1e293b; } 
  }
  
  /* 상단 미니 요약 2열 그리드 */
  .stats-grid {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; width: 100%; margin-top: 12px; margin-bottom: 30px;
    
    .stat-card {
      background: white; 
      border: 1px solid #e2e8f0;        /* 💡 테두리 초록색 제거 후 슬레이트 룩으로 통일 */
      border-radius: 8px; padding: 12px 8px; text-align: center;
      
      .val { 
        font-size: 18px; font-weight: 800; 
        color: #0ea5a4;                 /* 💡 수치 포인트를 기존 초록색(#27ae60)에서 브랜드 메인 민트/틸 컬러로 변경! */
        margin-bottom: 2px; 
      }
      .lbl { font-size: 11px; font-weight: 700; color: #94a3b8; }
    }
  }
  
  /* 하단 버튼 그룹 하우징 */
  .bottom-btn-group {
    width: 100%; display: flex; flex-direction: column; gap: 8px; margin-top: auto;
  }
  
  /* 마이페이지 전용 로그아웃 및 회원탈퇴 단추 */
  .logout-btn { 
    background: #ffffff; color: #64748b; 
    border: 1px solid #e2e8f0; 
    width: 100%; padding: 10px; border-radius: 6px; font-weight: 700; font-size: 13px; cursor: pointer; text-align: center; 
    transition: all 0.15s;
    box-sizing: border-box;
    &:hover { background: #f1f5f9; color: #1e293b; } 
  }
  .withdraw-btn { 
    background: #ffffff; color: #94a3b8; /* 💡 탈퇴 버튼이 너무 붉게 튀지 않도록 평소에는 무채색 그레이 톤 처리 권장 */
    border: none; width: 100%; padding: 10px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; text-align: center; 
    box-sizing: border-box;
    &:hover { background: #fef2f2; color: #e74c3c; } /* 💡 마우스 올렸을 때만 경고 의미로 붉게 활성화 */
  }

  @media (max-width: 900px) {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
    padding: 28px 24px;

    .avatar-circle {
      width: 76px;
      height: 76px;
      margin-bottom: 10px;

      i {
        font-size: 76px;
      }
    }

    .user-id {
      margin-bottom: 18px;
    }

    .stats-grid {
      max-width: 420px;
    }

    .bottom-btn-group {
      max-width: 420px;
      margin-top: 0;
    }
  }
`;

export const RightContentSection = styled.div`
  flex: 1; padding: 40px 52px; box-sizing: border-box; overflow-y: auto;
  
  /* 섹션 헤더 타이틀 라인 (예: 시각화 자료 보관함 등) */
  .section-title-row { 
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; 
    h3 { font-size: 20px; font-weight: 800; color: #1e293b; margin: 0; } 
    
    /* 전체보기 등의 우측 서브 액션 버튼 */
    button { 
      background: #ffffff; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; 
      font-weight: 700; color: #64748b; font-size: 12px; cursor: pointer; 
      transition: all 0.15s;
      &:hover { background: #f8fafc; color: #1e293b; }
    } 
  }

  @media (max-width: 900px) {
    padding: 28px 32px;
  }

  @media (max-width: 560px) {
    padding: 22px 18px;

    .section-title-row {
      align-items: flex-start;
      flex-direction: column;
      gap: 10px;

      button {
        width: 100%;
      }
    }
  }
`;

export const VisualBoxContainer = styled.div`
  display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 48px;
`;

export const VisualCard = styled.div`
  border: 1px solid #e2e8f0;            /* 💡 외곽 테두리 두께 얇고 정교하게 조정 (2px -> 1px) */
  border-radius: 12px; background: white; padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  
  &:hover {
    transform: translateY(-2px);        /* 💡 메인 기능 카드처럼 마우스 오버 시 가볍게 떠오르는 인터랙션 통일 */
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.04);
    border-color: #cbd5e1;
  }

  /* 카드 상단 가상 이미지/차트 프리뷰 구역 */
  .mock-img { 
    height: 80px; 
    background: #f1f5f9;                /* 💡 썸네일 기본 배경을 한 톤 더 맑고 깨끗하게 변경 */
    border-radius: 8px; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; 
    font-size: 24px; color: #0ea5a4; 
  }
  
  /* 카드 데이터 제목 */
  h4 { margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #1e293b; }
  
  /* 생성 일자 텍스트 라벨 */
  span { 
    font-size: 11.5px; 
    color: #94a3b8;                     /* 💡 글씨가 너무 흐려 보이지 않도록 톤 상향 조정 (#cbd5e1 -> #94a3b8) */
    font-weight: 600; 
  }
`;

export const HistoryList = styled.div`
  display: flex; flex-direction: column; 
  border-top: 1px solid #e2e8f0;        /* 💡 상단 리스트 시작 구분선 생성 */
  
  /* 개별 히스토리 로우(Row) 아이템 */
  .history-item {
    display: flex; justify-content: space-between; align-items: center; 
    padding: 16px 8px; 
    border-bottom: 1px solid #f1f5f9;   /* 💡 항목 간의 얇은 그레이 구분선 */
    font-size: 13.5px;                  /* 💡 폰트 가독 크기 맞춤 조정 */
    font-weight: 600;
    transition: background 0.1s;
    cursor: pointer;

    &:hover {
      background: #f8fafc;              /* 💡 리스트 한 줄씩 마우스 올릴 때 줄 선택 효과 부여 */
    }
    
    /* 좌측 아이콘 + 제목 영역 */
    .title-side { 
      display: flex; align-items: center; gap: 12px; 
      color: #334155; 
      
      /* 논문 파일 유형별 기본 아이콘 컬러 브랜딩화 */
      i { 
        color: #546e7a;                 /* 💡 튀는 원색 파랑 대신 차분한 가이딩용 블루그레이 톤 적용 */
        font-size: 15px;
      } 
    }
    
    /* 우측 기록 일자 영역 */
    .date-side { 
      color: #94a3b8;                   /* 💡 일자 색상 시안성 보정 (#cbd5e1 -> #94a3b8) */
      font-size: 12px; font-weight: 700; 
    }
  }

  @media (max-width: 560px) {
    .history-item {
      align-items: flex-start;
      flex-direction: column;
      gap: 6px;

      .title-side {
        align-items: flex-start;
        line-height: 1.45;
      }
    }
  }
`;
