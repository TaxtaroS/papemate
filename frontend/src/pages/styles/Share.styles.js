import styled from 'styled-components';
import { palette } from '../../shared/palette';

/* Share 페이지 전용 스타일 모음입니다.
   페이지 컴포넌트에는 화면 흐름과 이벤트 로직만 남기기 위해 styled-components를 이 파일로 분리했습니다. */
export const Container = styled.div`
  display: flex;
  width: 100%;
  height: 100vh;
  background: #ffffff;
  box-sizing: border-box;

  @media (max-width: 1000px) {
    flex-direction: column;
    height: auto;
    min-height: 100vh;
  }
`;

export const MainTimelineContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 36px 48px;
  box-sizing: border-box;
  overflow-y: auto;

  .header-area {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 22px;
  }

  .menu-toggle {
    font-size: 22px;
    color: #1e293b;
  }

  h2 {
    font-size: 22px;
    font-weight: 800;
    color: #1e293b;
    margin: 0;
  }

  @media (max-width: 760px) {
    padding: 28px 24px;

    .header-area {
      align-items: flex-start;
      gap: 10px;
    }

    h2 {
      font-size: 19px;
      line-height: 1.35;
    }
  }

  @media (max-width: 520px) {
    padding: 24px 18px;
  }
`;

export const TimelineInner = styled.div`
  width: 100%;
  max-width: 980px;
`;

export const ProjectLoadBar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 24px;
  width: 100%;

  select {
    min-width: 240px;
    height: 36px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 0 10px;
    color: #1e293b;
    font-size: 13px;
    font-weight: 700;
    outline: none;
    background: #ffffff;
  }

  button {
    height: 36px;
    border: none;
    border-radius: 6px;
    padding: 0 16px;
    background: #0ea5a4;
    color: #ffffff;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
  }

  .hint {
    margin-left: auto;
    color: #94a3b8;
    font-size: 12px;
    font-weight: 700;
  }

  @media (max-width: 760px) {
    align-items: stretch;
    flex-direction: column;

    select,
    button {
      width: 100%;
    }

    .hint {
      margin-left: 0;
      line-height: 1.45;
    }
  }
`;

export const SectionTitle = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: #64748b;
  margin-bottom: 20px;
`;

export const TimelineWrapper = styled.div`
  position: relative;
  margin-left: 10px;
  padding-left: 30px;

  &::before {
    content: '';
    position: absolute;
    left: 6px;
    top: 12px;
    bottom: 12px;
    width: 2px;
    background: #e2e8f0;
  }

  .empty-state {
    border: 1px dashed #cbd5e1;
    border-radius: 8px;
    background: #ffffff;
    padding: 28px 20px;
    color: #94a3b8;
    font-size: 13px;
    font-weight: 750;
    text-align: center;
  }

  @media (max-width: 520px) {
    margin-left: 0;
    padding-left: 22px;

    &::before {
      left: 4px;
    }
  }
`;

export const TimelineNode = styled.article`
  position: relative;
  margin-bottom: 20px;

  .dot {
    position: absolute;
    left: -30px;
    top: 8px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${(props) => (props.$active ? '#0ea5a4' : '#cbd5e1')};
    border: 2px solid white;
    box-shadow: ${(props) => (props.$active ? '0 0 0 4px rgba(14, 165, 164, 0.14)' : 'none')};
    box-sizing: border-box;
  }

  .card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px 18px;
  }

  .project-label {
    color: #0ea5a4;
    font-size: 12px;
    font-weight: 800;
    margin-bottom: 8px;
  }

  h4 {
    margin: 0 0 6px 0;
    color: #0f172a;
    font-size: 15px;
    font-weight: 800;
  }

  .meta {
    color: #94a3b8;
    font-size: 11.5px;
    font-weight: 700;
    margin-bottom: 10px;
  }

  .body {
    color: #334155;
    font-size: 13px;
    font-weight: 650;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }

  .restore-btn {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #475569;
    font-weight: 800;
    font-size: 12px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    border-radius: 6px;
  }

  .restore-btn:hover {
    background: #e6f4f4;
    color: #0ea5a4;
    border-color: #bce3e3;
  }

  @media (max-width: 520px) {
    .dot {
      left: -24px;
    }

    .card {
      padding: 14px;
    }

    h4 {
      font-size: 14px;
      line-height: 1.4;
    }

    .restore-btn {
      width: 100%;
      justify-content: center;
    }
  }
`;

export const ResultTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  font-size: 12px;

  th,
  td {
    border: 1px solid #e2e8f0;
    padding: 8px 10px;
    text-align: left;
  }

  th {
    background: #f8fafc;
    color: #475569;
    font-weight: 800;
  }

  td {
    color: #334155;
    font-weight: 650;
  }

  @media (max-width: 560px) {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }
`;

export const RightCoopPanel = styled.aside`
  width: 340px;
  background: #f8fafc;
  border-left: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;

  .load-btn {
    background: #0ea5a4;
    color: white;
    border: none;
    margin: 24px 22px 18px 22px;
    padding: 13px;
    border-radius: 8px;
    font-weight: 800;
    font-size: 14px;
    cursor: pointer;
  }

  .code-row {
    margin: 0 22px 20px 22px;
    display: flex;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #cbd5e1;
    background: #ffffff;
  }

  .code-label {
    background: #64748b;
    color: white;
    padding: 10px 12px;
    font-weight: 800;
    font-size: 12px;
  }

  .code-input {
    min-width: 0;
    flex: 1;
    border: none;
    padding: 0 12px;
    color: #1e293b;
    font-family: monospace;
    font-size: 13px;
    font-weight: 800;
    outline: none;
    text-align: center;
  }

  .join-action {
    background: #f1f5f9;
    color: #475569;
    border: none;
    border-left: 1px solid #cbd5e1;
    padding: 0 12px;
    font-weight: 800;
    font-size: 12px;
    cursor: pointer;
  }

  .notice {
    margin: -10px 22px 16px 22px;
    color: ${(props) => (props.$error ? '#dc2626' : '#64748b')};
    font-size: 11.5px;
    font-weight: 700;
    min-height: 16px;
  }

  @media (max-width: 1000px) {
    width: 100%;
    min-height: 420px;
    border-left: none;
    border-top: 1px solid #e2e8f0;
  }

  @media (max-width: 520px) {
    .code-row {
      flex-wrap: wrap;
    }

    .code-label,
    .join-action {
      min-height: 38px;
    }
  }
`;

export const MembersBox = styled.div`
  padding: 0 22px 18px 22px;
  border-bottom: 1px solid #e2e8f0;

  h5 {
    margin: 0 0 12px 0;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.5px;
  }

  .m-item,
  .empty {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    color: #334155;
    font-size: 13px;
    font-weight: 750;
  }

  .empty {
    color: #94a3b8;
  }

  i {
    color: ${palette.slate[4]};
  }
`;

export const ChatTimelineFeed = styled.div`
  flex: 1;
  padding: 16px 18px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #ffffff;
`;

export const TalkBubble = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${(props) => (props.$isMe ? 'flex-end' : 'flex-start')};
  align-self: ${(props) => (props.$isMe ? 'flex-end' : 'flex-start')};
  max-width: 88%;

  .user-id {
    display: flex;
    align-items: center;
    gap: 5px;
    color: #64748b;
    font-size: 11.5px;
    font-weight: 800;
    margin-bottom: 6px;
  }

  .msg-row {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    flex-direction: ${(props) => (props.$isMe ? 'row-reverse' : 'row')};
  }

  .message-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-direction: ${(props) => (props.$isMe ? 'row-reverse' : 'row')};
  }

  .bubble {
    background: ${(props) => (props.$isMe ? '#0ea5a4' : '#f1f5f9')};
    color: ${(props) => (props.$isMe ? 'white' : '#1e293b')};
    padding: 10px 14px;
    border-radius: ${(props) => (props.$isMe ? '12px 2px 12px 12px' : '2px 12px 12px 12px')};
    font-size: 13px;
    font-weight: 700;
    line-height: 1.45;
    white-space: pre-wrap;
  }

  .timestamp {
    min-width: 48px;
    color: #94a3b8;
    font-size: 10px;
    font-weight: 700;
    text-align: ${(props) => (props.$isMe ? 'right' : 'left')};
  }

  .delete-btn {
    width: 22px;
    height: 22px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #ffffff;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 900;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: all 0.12s ease;
  }

  &:hover .delete-btn {
    opacity: 1;
  }

  .delete-btn:hover {
    color: #dc2626;
    border-color: #fecaca;
    background: #fef2f2;
  }

  @media (max-width: 520px) {
    max-width: 96%;

    .msg-row {
      align-items: flex-start;
      flex-direction: column;
    }

    .message-actions {
      align-items: flex-start;
    }

    .bubble {
      font-size: 12.5px;
    }

    .timestamp {
      min-width: 0;
    }

    .delete-btn {
      opacity: 1;
    }
  }
`;

export const FooterInputBox = styled.div`
  display: flex;
  gap: 8px;
  padding: 16px;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;

  input {
    flex: 1;
    min-width: 0;
    padding: 10px 14px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    color: #1e293b;
    font-size: 13px;
    font-weight: 700;
    outline: none;
  }

  input::placeholder {
    color: #94a3b8;
  }

  button {
    background: #0ea5a4;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0 14px;
    font-weight: 800;
    font-size: 13px;
    cursor: pointer;
  }

  @media (max-width: 520px) {
    padding: 12px;

    button {
      padding: 0 12px;
    }
  }
`;

export const ProjectPickerOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.28);
  padding: 32px;

  @media (max-width: 560px) {
    padding: 14px;
  }
`;

export const ProjectPickerPanel = styled.div`
  width: min(860px, 100%);
  max-height: min(680px, calc(100vh - 64px));
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.18);

  .picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 20px 24px;
    border-bottom: 1px solid #e2e8f0;
  }

  .picker-title {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  h3 {
    margin: 0;
    color: #0f172a;
    font-size: 18px;
    font-weight: 850;
  }

  .picker-desc {
    color: #64748b;
    font-size: 12.5px;
    font-weight: 700;
  }

  .close-btn {
    width: 34px;
    height: 34px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #ffffff;
    color: #475569;
    font-size: 18px;
    font-weight: 800;
    cursor: pointer;
  }

  .close-btn:hover {
    background: #f8fafc;
    color: #0f172a;
  }

  @media (max-width: 560px) {
    max-height: calc(100vh - 28px);
    border-radius: 8px;

    .picker-header {
      align-items: flex-start;
      padding: 18px;
    }

    h3 {
      font-size: 16px;
    }
  }
`;

export const ProjectPickerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 16px;
  padding: 24px;
  overflow-y: auto;

  .empty-state {
    grid-column: 1 / -1;
    border: 1px dashed #cbd5e1;
    border-radius: 8px;
    padding: 28px 20px;
    color: #94a3b8;
    font-size: 13px;
    font-weight: 750;
    text-align: center;
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    padding: 18px;
  }
`;

export const ProjectPickerCard = styled.button`
  min-height: 154px;
  border: 1px solid ${(props) => (props.$loaded ? '#bce3e3' : '#e2e8f0')};
  border-radius: 8px;
  background: ${(props) => (props.$loaded ? '#f0fdfa' : '#ffffff')};
  padding: 18px;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: #0ea5a4;
    box-shadow: 0 10px 20px rgba(15, 23, 42, 0.06);
  }

  .tag-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 3px 10px;
    border-radius: 999px;
    background: #f1f5f9;
    color: #475569;
    font-size: 11px;
    font-weight: 850;
  }

  .loaded-label {
    color: #0ea5a4;
    font-size: 11px;
    font-weight: 850;
  }

  .project-name {
    color: #0f172a;
    font-size: 15px;
    font-weight: 850;
    line-height: 1.35;
  }

  .updated {
    color: #94a3b8;
    font-size: 11.5px;
    font-weight: 750;
  }

  .meta {
    margin-top: auto;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    color: #64748b;
    font-size: 12px;
    font-weight: 750;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
`;
