import React, { useState } from "react";
import styled from "styled-components";

const FAQContainer = styled.div`
  height: 100%;
  width: 100%;
  overflow-y: auto;
  padding: 40px 32px;
  color: #1f2937;
  position: relative;
  box-sizing: border-box;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.32) transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.32);
    border-radius: 999px;
    border: 2px solid transparent;
    background-clip: content-box;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: rgba(100, 116, 139, 0.42);
  }

  .popup-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 80;
    padding: 18px;
  }

  .popup-card {
    width: min(640px, 100%);
    background: #ffffff;
    border-radius: 22px;
    padding: 28px;
    box-shadow: 0 28px 60px rgba(15, 23, 42, 0.18);
    position: relative;
  }

  .popup-card h3 {
    margin: 0 0 16px;
    font-size: 22px;
    color: #0f172a;
  }

  .popup-card p {
    margin: 0 0 18px;
    color: #475569;
    line-height: 1.8;
  }

  .popup-card textarea {
    width: 100%;
    min-height: 140px;
    border: 1px solid #cbd5e1;
    border-radius: 14px;
    padding: 16px;
    resize: vertical;
    font-size: 14px;
    color: #0f172a;
    background: #f8fafc;
    box-sizing: border-box;
  }

  .popup-card .contact-info {
    margin: 20px 0;
    padding: 16px;
    background: #f1f5f9;
    border-radius: 14px;
    border: 1px solid #e2e8f0;
    word-break: break-all;
    color: #0f172a;
  }

  .popup-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 18px;
  }

  .popup-button {
    cursor: pointer;
    border: none;
    border-radius: 12px;
    padding: 12px 18px;
    font-weight: 700;
  }

  .popup-button.primary {
    background: #0f766e;
    color: #ffffff;
  }

  .popup-button.secondary {
    background: #f8fafc;
    color: #0f172a;
    border: 1px solid #cbd5e1;
  }
`;

const FAQContent = styled.div`
  width: 100%;
  max-width: 950px;
  margin: 0 auto;

  h2 {
    font-size: 32px;
    margin-bottom: 24px;
    color: #0f172a;
  }

  p.description {
    font-size: 15px;
    color: #475569;
    margin-bottom: 30px;
    line-height: 1.8;
  }

  .tab-list {
    display: flex;
    gap: 10px;
    margin-bottom: 28px;
    flex-wrap: wrap;
  }

  .tab-button {
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 700;
    border-radius: 999px;
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    color: #0f172a;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .tab-button.active {
    background: #0f766e;
    color: #f8fafc;
    border-color: #0f766e;
  }

  .tab-button:hover {
    background: #e2e8f0;
  }

  .tab-panel {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    padding: 28px;
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
  }

  .question {
    margin-top: 24px;
  }

  .question h3 {
    font-size: 18px;
    margin-bottom: 10px;
    color: #111827;
  }

  .question p {
    margin: 0;
    font-size: 15px;
    color: #475569;
    line-height: 1.8;
  }

  .question ul {
    margin: 12px 0 0 20px;
    color: #475569;
  }

  .question li {
    margin-bottom: 10px;
  }

  .popup-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    padding: 18px;
  }

  .popup-card {
    width: min(640px, 100%);
    background: #ffffff;
    border-radius: 22px;
    padding: 28px;
    box-shadow: 0 28px 60px rgba(15, 23, 42, 0.18);
    position: relative;
  }

  .popup-card h3 {
    margin: 0 0 16px;
    font-size: 22px;
    color: #0f172a;
  }

  .popup-card p {
    margin: 0 0 18px;
    color: #475569;
    line-height: 1.8;
  }

  .popup-card textarea {
    width: 100%;
    min-height: 140px;
    border: 1px solid #cbd5e1;
    border-radius: 14px;
    padding: 16px;
    resize: vertical;
    font-size: 14px;
    color: #0f172a;
    background: #f8fafc;
  }

  .popup-card .contact-info {
    margin: 20px 0;
    padding: 16px;
    background: #f1f5f9;
    border-radius: 14px;
    border: 1px solid #e2e8f0;
    word-break: break-all;
    color: #0f172a;
  }

  .popup-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 18px;
  }

  .popup-button {
    cursor: pointer;
    border: none;
    border-radius: 12px;
    padding: 12px 18px;
    font-weight: 700;
  }

  .popup-button.primary {
    background: #0f766e;
    color: #ffffff;
  }

  .popup-button.secondary {
    background: #f8fafc;
    color: #0f172a;
    border: 1px solid #cbd5e1;
  }
`;

const tabItems = [
  { id: "usage", label: "사용법" },
  { id: "security", label: "보안" },
  { id: "other", label: "기타 질문" },
  { id: "contact", label: "관리자 문의" },
];

function FAQC() {
  const [activeTab, setActiveTab] = useState("usage");
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const adminContact = "https://github.com/pokfamadm/project_v1";

  const handleOpenContact = () => setIsContactOpen(true);
  const handleCloseContact = () => setIsContactOpen(false);
  const handleSendMail = () => {
    const subject = encodeURIComponent("PaperMate 관리자 문의");
    const body = encodeURIComponent(
      `${contactMessage}\n\n관리자 GitHub 주소: ${adminContact}`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <FAQContainer>
      <FAQContent>
      <h2>자주 묻는 질문 (FAQ)</h2>
      <p className="description">
        PaperMate 사용 중 필요한 정보를 빠르게 찾을 수 있도록 질문을 분류해 두었습니다.
      </p>

      <div className="tab-list">
        {tabItems.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-panel">
        {activeTab === "usage" && (
          <>
            <div className="question">
              <h3>Q1. 로그인 없이도 사용할 수 있나요?</h3>
              <p>
                네, 일부 기능은 로그인 없이도 사용할 수 있습니다. 다만 프로젝트 저장, 공유, 최근 기록 복원 등은 로그인 후에 이용하실 수 있습니다.
              </p>
            </div>

            <div className="question">
              <h3>Q2. 문서를 어떻게 업로드하나요?</h3>
              <p>
                홈 화면에서 분석 메뉴(+)를 눌러 문서를 업로드하시면 AI가 문서 내용을 자동으로 분석 및 요약합니다. 업로드 가능한 파일 형식은 PDF, HWP, HWPX, DOCX, 이미지 등입니다.
              </p>
            </div>

            <div className="question">
              <h3>Q3. 팀원과 어떻게 공유하나요?</h3>
              <p>
                공유 페이지에서 초대 코드를 생성하거나 입력하여 팀원을 초대하실 수 있습니다. 프로젝트를 함께 열람하고 협업할 수 있습니다.
              </p>
            </div>

            <div className="question">
              <h3>Q4. FAQ에 없는 문의는 어디로 하나요?</h3>
              <p>
                추가 문의가 필요하시면 서비스 제공자에게 문의하거나 앱 내 지원 채널을 통해 질문을 남겨주세요.
              </p>
            </div>
          </>
        )}

        {activeTab === "security" && (
          <>
            <div className="question">
              <h3>Q1. 문서는 어떻게 저장되나요?</h3>
              <p>
                업로드된 문서는 서버에 임시 저장되며, 로그인한 사용자의 경우 프로젝트로 저장하면 해당 계정과 연결됩니다. 비로그인 상태에서는 분석 결과만 임시로 유지되며 브라우저를 닫거나 새로고침하면 사라질 수 있습니다.
              </p>
            </div>

            <div className="question">
              <h3>Q2. 로그아웃이나 탈퇴 시 내 데이터는 어떻게 되나요?</h3>
              <p>
                로그아웃하면 현재 세션 정보가 종료되고, 저장된 프로젝트와 기록은 계정에 남아 있습니다. 탈퇴 시에는 계정에 연결된 데이터가 삭제될 수 있으므로, 탈퇴 전에 필요한 문서나 프로젝트를 별도로 백업해 두는 것이 좋습니다.
              </p>
            </div>

            <div className="question">
              <h3>Q3. 문서를 다운로드할 수 있나요?</h3>
              <p>
                현재 PaperMate는 문서 자체를 직접 다운로드하는 방식보다는 분석 결과와 요약을 제공합니다. 업로드한 원본 파일은 서비스 정책에 따라 보관되며, 필요한 경우 별도 요청을 통해 파일을 받을 수 있는지 확인해야 합니다.
              </p>
            </div>

            <div className="question">
              <h3>Q4. 누구나 내 문서를 다운로드할 수 있나요?</h3>
              <p>
                아니요. 문서와 프로젝트는 초대 코드나 공유 권한이 있는 사용자만 접근할 수 있습니다. 공개하지 않은 프로젝트는 외부 사용자에게 노출되지 않습니다.
              </p>
            </div>
          </>
        )}

        {activeTab === "other" && (
          <>
            <div className="question">
              <h3>Q1. 모바일에서도 사용할 수 있나요?</h3>
              <p>
                현재는 웹 브라우저 기반 서비스로, 모바일 브라우저에서도 접속 가능합니다. 하지만 데스크톱 환경에 최적화되어 있어 작은 화면에서는 일부 UI가 제한될 수 있습니다.
              </p>
            </div>

            <div className="question">
              <h3>Q2. 사용 시 유의할 점이 있나요?</h3>
              <p>
                분석 결과는 AI 기반 요약이므로 중요한 공식이나 표, 이미지 내용은 일부 누락될 수 있습니다. 중요한 문서는 원본 파일을 보관하고, 결과를 검토 후 직접 확인하는 것이 안전합니다.
              </p>
            </div>

            <div className="question">
              <h3>Q3. 다른 고객 문의는 어떻게 하나요?</h3>
              <p>
                고객 문의가 필요한 경우 서비스 제공자의 연락처 또는 앱 내 지원 채널을 통해 문의해 주세요. 문의 시 가능한 자세한 내용을 함께 전달하면 빠른 답변을 받을 수 있습니다.
              </p>
            </div>
          </>
        )}

        {activeTab === "contact" && (
          <>
            <div className="question">
              <h3>관리자 문의</h3>
              <p>
                관리자 문의는 아래 팝업에서 메시지를 작성하신 뒤 메일 클라이언트로 연결해 주세요.
              </p>
              <button type="button" className="tab-button active" onClick={handleOpenContact}>
                이메일 문의 열기
              </button>
            </div>
          </>
        )}
      </div>

      </FAQContent>

      {isContactOpen && (
        <div className="popup-overlay" onClick={handleCloseContact}>
          <div className="popup-card" onClick={(event) => event.stopPropagation()}>
            <h3>관리자 이메일 문의</h3>
            <p>아래에 문의 내용을 작성한 뒤 메일 클라이언트를 통해 발송할 수 있습니다.</p>
            <div className="contact-info">관리자 GitHub 주소: {adminContact}</div>
            <textarea
              value={contactMessage}
              onChange={(event) => setContactMessage(event.target.value)}
              placeholder="문의 내용을 입력하세요..."
            />
            <div className="popup-actions">
              <button type="button" className="popup-button secondary" onClick={handleCloseContact}>
                닫기
              </button>
              <button type="button" className="popup-button primary" onClick={handleSendMail}>
                메일 보내기
              </button>
            </div>
          </div>
        </div>
      )}
    </FAQContainer>
  );
}

export default FAQC;
