// 초보자 안내: styled-components로 화면의 색상, 간격, 배치 같은 스타일을 정의하는 파일입니다.

import styled from 'styled-components';

export const MainLayout = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
  height: 100%;

  @media (max-width: 900px) {
    flex-direction: column;
    overflow: auto;
  }
`;

export const VisualPanel = styled.div`
  flex: 0 0 30%;
  min-width: 280px;
  border-right: 1px solid #e2e8f0;
  padding: 16px;
  overflow: hidden;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 12px;

  .title {
    font-size: 14px;
    font-weight: 850;
    color: #0f172a;
  }

  .hint {
    margin: -4px 0 4px 0;
    color: #64748b;
    font-size: 12px;
    font-weight: 650;
    line-height: 1.45;
  }

  .asset-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    min-height: 38px;
    padding: 9px 10px;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 850;
    color: #334155;
    transition: all 0.15s ease;

    &:hover {
      border-color: #0ea5a4;
      color: #0f766e;
      background: #f0fdfa;
    }
  }

  .visual-actions {
    border-top: 1px solid #e2e8f0;
    padding-top: 12px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .asset-item {
    font-size: 12px;
    padding: 10px 11px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #ffffff;
    color: #475569;
    font-weight: 750;
    line-height: 1.45;

    strong {
      display: block;
      margin-bottom: 4px;
      color: #0f172a;
      font-size: 12.5px;
    }

    span {
      color: #94a3b8;
      font-size: 11px;
    }
  }

  @media (max-width: 900px) {
    flex: none;
    width: 100%;
    max-width: none;
    min-width: 0;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
    max-height: 44vh;
  }
`;

export const VisualArtifact = styled.div`
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: #ffffff;
  overflow: hidden;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);

  .artifact-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;

    h4 {
      margin: 0;
      color: #0f172a;
      font-size: 15px;
      font-weight: 850;
    }

    span {
      flex: 0 0 auto;
      color: #0ea5a4;
      font-size: 11px;
      font-weight: 850;
    }
  }

  .artifact-body {
    padding: 16px;
  }

  .artifact-desc {
    margin: 0 0 12px 0;
    color: #475569;
    font-size: 13px;
    font-weight: 650;
    line-height: 1.55;
  }

  .save-container {
    width: 100%;
  }

  .save-visual {
    width: 100%;
    min-height: 38px;
    border: none;
    border-top: 1px solid #e2e8f0;
    background: #0ea5a4;
    color: #ffffff;
    font-size: 13px;
    font-weight: 850;
    cursor: pointer;
    
    &:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }
  }

  &.is-modal {
    .save-container {
      display: flex;
      justify-content: flex-end;
      padding: 12px 24px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .save-visual {
      width: auto;
      min-height: 34px;
      border: 1px solid #0ea5a4;
      border-radius: 6px;
      background: #0ea5a4;
      color: #ffffff;
      padding: 0 16px;
      font-size: 12px;
      font-weight: 800;
      border-top: none;

      &:hover {
        background: #0d9488;
        border-color: #0d9488;
      }

      &:disabled {
        background: #f1f5f9;
        border-color: #cbd5e1;
        color: #94a3b8;
        cursor: not-allowed;
      }
    }
  }

  .mini-table {
    display: grid;
    grid-template-columns: minmax(96px, 0.85fr) minmax(150px, 1.5fr) 72px;
    border: 2px solid #94a3b8;
    border-radius: 10px;
    overflow: hidden;
    background: #ffffff;
    box-shadow: inset 0 0 0 1px #e2e8f0;

    div {
      padding: 9px 10px;
      border-bottom: 1px solid #cbd5e1;
      border-right: 1px solid #cbd5e1;
      color: #334155;
      font-size: 12px;
      font-weight: 700;
      min-height: 34px;
      line-height: 1.35;
      display: flex;
      align-items: center;
    }

    div:nth-child(3n) {
      border-right: none;
      justify-content: center;
      font-variant-numeric: tabular-nums;
    }

    div:nth-last-child(-n + 3) {
      border-bottom: none;
    }

    .th {
      background: #0f766e;
      color: #ffffff;
      font-weight: 900;
      justify-content: center;
    }
  }

  .mini-graph {
    position: relative;
    height: 220px;
    display: flex;
    align-items: flex-end;
    gap: 14px;
    padding: 32px 22px 34px 42px;
    border: 2px solid #cbd5e1;
    border-radius: 10px;
    background:
      linear-gradient(#e2e8f0 1px, transparent 1px) 0 0 / 100% 25%,
      linear-gradient(90deg, #e2e8f0 1px, transparent 1px) 0 0 / 20% 100%,
      linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);

    &::before {
      content: '';
      position: absolute;
      left: 34px;
      top: 18px;
      bottom: 30px;
      width: 2px;
      background: #334155;
      border-radius: 999px;
    }

    &::after {
      content: '';
      position: absolute;
      left: 34px;
      right: 16px;
      bottom: 30px;
      height: 2px;
      background: #334155;
      border-radius: 999px;
    }

    .axis {
      position: absolute;
      color: #64748b;
      font-size: 10px;
      font-weight: 900;
    }

    .y-axis {
      top: 10px;
      left: 10px;
    }

    .x-axis {
      right: 14px;
      bottom: 8px;
    }

    .graph-line {
      position: absolute;
      left: 34px;
      right: 16px;
      top: 18px;
      bottom: 30px;
      width: calc(100% - 50px);
      height: calc(100% - 48px);
      overflow: visible;
      z-index: 2;

      polyline {
        fill: none;
        stroke: #dc2626;
        stroke-width: 3.4;
        stroke-linecap: round;
        stroke-linejoin: round;
        filter: drop-shadow(0 2px 3px rgba(220, 38, 38, 0.22));
      }

      circle {
        fill: #ffffff;
        stroke: #dc2626;
        stroke-width: 2.4;
      }
    }

    .bar-wrap {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      min-width: 0;
      height: 100%;
      position: relative;
      z-index: 1;
    }

    .bar {
      width: 100%;
      max-width: 46px;
      border-radius: 8px 8px 2px 2px;
      background: linear-gradient(180deg, #14b8a6 0%, #2563eb 100%);
      box-shadow: 0 6px 12px rgba(37, 99, 235, 0.18);
    }

    strong {
      color: #0f172a;
      font-size: 11px;
      font-weight: 900;
      font-variant-numeric: tabular-nums;
    }

    span {
      max-width: 70px;
      color: #64748b;
      font-size: 11px;
      font-weight: 750;
      text-align: center;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .mini-image {
    min-height: 180px;
    border: 1px solid #dbeafe;
    border-radius: 12px;
    background:
      radial-gradient(circle at 20% 18%, rgba(20, 184, 166, 0.18), transparent 28%),
      linear-gradient(135deg, #eff6ff 0%, #ffffff 52%, #f0fdfa 100%);
    padding: 18px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 16px;

    .image-title {
      color: #0f172a;
      font-size: 18px;
      font-weight: 900;
      line-height: 1.35;
    }

    &::before {
      content: '';
      width: 100%;
      height: 54px;
      border-radius: 10px;
      background:
        linear-gradient(135deg, rgba(14, 165, 164, 0.2), rgba(37, 99, 235, 0.12)),
        repeating-linear-gradient(135deg, transparent 0 8px, rgba(14, 165, 164, 0.08) 8px 12px);
      border: 1px solid #bfdbfe;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .chips span {
      padding: 6px 9px;
      border-radius: 999px;
      background: #ffffff;
      border: 1px solid #bae6fd;
      color: #0369a1;
      font-size: 11px;
      font-weight: 850;
    }
  }

  .mini-mindmap {
    position: relative;
    min-height: 230px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 22px;
    display: grid;
    grid-template-columns: minmax(120px, 0.8fr) minmax(190px, 1.4fr);
    gap: 30px;
    align-items: center;
    background:
      radial-gradient(circle at 18% 50%, rgba(14, 165, 164, 0.12), transparent 28%),
      #ffffff;

    .center-node {
      position: relative;
      z-index: 2;
      min-height: 96px;
      border-radius: 50%;
      background: #0ea5a4;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 14px;
      font-size: 13px;
      font-weight: 900;
      box-shadow: 0 12px 22px rgba(14, 165, 164, 0.22);
    }

    .tree-trunk {
      position: absolute;
      left: 34%;
      top: 50%;
      width: 16%;
      height: 3px;
      background: #94a3b8;
      transform: translateY(-50%);
      border-radius: 999px;
    }

    .branches {
      position: relative;
      z-index: 1;
      display: grid;
      gap: 10px;

      &::before {
        content: '';
        position: absolute;
        left: -17px;
        top: 16px;
        bottom: 16px;
        width: 3px;
        background: #94a3b8;
        border-radius: 999px;
      }
    }

    .branches span {
      position: relative;
      border: 1px solid #cbd5e1;
      border-left: 5px solid #2563eb;
      border-radius: 8px;
      padding: 8px 10px;
      color: #334155;
      font-size: 12px;
      font-weight: 800;
      background: #f8fafc;
      line-height: 1.35;

      &::before {
        content: '';
        position: absolute;
        left: -20px;
        top: 50%;
        width: 20px;
        height: 2px;
        background: #94a3b8;
      }
    }
  }
`;

export const InviteCodePill = styled.button`
  min-height: 36px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #334155;
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  padding: 0;
  cursor: copy;

  span {
    align-self: stretch;
    display: inline-flex;
    align-items: center;
    padding: 0 10px;
    background: #64748b;
    color: #ffffff;
    font-size: 12px;
    font-weight: 850;
  }

  strong {
    min-width: 86px;
    padding: 0 12px;
    font-family: monospace;
    font-size: 13px;
    color: #0f172a;
  }

  &:hover {
    border-color: #0ea5a4;
  }
`;

export const SaveInlinePanel = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 32px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;

  input {
    flex: 1;
    min-width: 0;
    height: 38px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 0 12px;
    outline: none;
    color: #0f172a;
    font-size: 13px;
    font-weight: 750;

    &:focus {
      border-color: #0ea5a4;
      box-shadow: 0 0 0 3px rgba(14, 165, 164, 0.12);
    }
  }

  button {
    min-height: 38px;
    border-radius: 8px;
    padding: 0 14px;
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #334155;
    font-size: 13px;
    font-weight: 850;
    cursor: pointer;
  }

  .primary {
    border-color: #0ea5a4;
    background: #0ea5a4;
    color: #ffffff;
  }

  @media (max-width: 680px) {
    padding: 10px 16px;
    flex-wrap: wrap;

    input {
      flex-basis: 100%;
    }
  }
`;

export const PreviewModalContainer = styled.div`
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.2);
  overflow-y: auto;
  
  /* 뷰어 내부 스타일 조정 (기존 VisualArtifact 디자인을 상속하되 더 넓게) */
  .artifact-head {
    padding: 20px 24px;
    h4 {
      font-size: 18px;
    }
  }

  .artifact-body {
    padding: 24px;
  }

  .artifact-desc {
    font-size: 15px;
    margin-bottom: 24px;
  }
`;

