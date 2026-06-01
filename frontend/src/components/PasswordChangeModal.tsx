// TypeScript 변경 표시: JSX가 들어 있는 React 파일이라 .js에서 .tsx로 바꾼 파일입니다.
// TypeScript 변경 표시: 기존 JS 로직은 유지하면서 함수 인자와 화면 props에 실제 타입을 붙여 TypeScript 검사를 통과하게 했습니다.
// 초보자 안내: 화면에서 재사용되는 UI 조각을 정의한 React 컴포넌트 파일입니다.

import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { ModalOverlay, ModalContent, ButtonGroup } from '../pages/styles/Modal.styles';

const PasswordChangeModal = ({ onClose, onSave, saving, error }) => {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [localError, setLocalError] = useState('');

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setLocalError('');
  };

  const handleSubmit = () => {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setLocalError('모든 비밀번호 항목을 입력해주세요.');
      return;
    }

    if (form.newPassword.length < 4) {
      setLocalError('새 비밀번호는 4자 이상 입력해주세요.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setLocalError('새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    onSave(form.currentPassword, form.newPassword);
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(event) => event.stopPropagation()}>
        <button className="icon-close" type="button" onClick={onClose} aria-label="닫기">
          <FiX />
        </button>
        <h3>비밀번호 변경</h3>

        <label className="field-label" htmlFor="current-password">현재 비밀번호</label>
        <input
          id="current-password"
          type="password"
          value={form.currentPassword}
          onChange={(event) => updateField('currentPassword', event.target.value)}
          placeholder="현재 비밀번호"
        />

        <label className="field-label" htmlFor="new-password">새 비밀번호</label>
        <input
          id="new-password"
          type="password"
          value={form.newPassword}
          onChange={(event) => updateField('newPassword', event.target.value)}
          placeholder="새 비밀번호"
        />

        <label className="field-label" htmlFor="confirm-password">새 비밀번호 확인</label>
        <input
          id="confirm-password"
          type="password"
          value={form.confirmPassword}
          onChange={(event) => updateField('confirmPassword', event.target.value)}
          placeholder="새 비밀번호 확인"
        />

        {(localError || error) && <p className="modal-error">{localError || error}</p>}

        <ButtonGroup>
          <button type="button" className="cancel" onClick={onClose}>취소</button>
          <button type="button" className="save" onClick={handleSubmit} disabled={saving}>
            {saving ? '변경 중...' : '변경'}
          </button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};

export default PasswordChangeModal;
