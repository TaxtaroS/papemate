// TypeScript 변경 표시: JSX가 들어 있는 React 파일이라 .js에서 .tsx로 바꾼 파일입니다.
// TypeScript 변경 표시: 기존 JS 로직은 유지하면서 함수 인자와 화면 props에 실제 타입을 붙여 TypeScript 검사를 통과하게 했습니다.
// 초보자 안내: 화면에서 재사용되는 UI 조각을 정의한 React 컴포넌트 파일입니다.

import React, { useState } from 'react';
import { FiCamera, FiTrash2, FiUser, FiX } from 'react-icons/fi';
import { ModalOverlay, ModalContent, ButtonGroup } from '../pages/styles/Modal.styles';

const readImageFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const ProfileEditModal = ({ currentUser, onClose, onSave, saving, error }) => {
  const [nickname, setNickname] = useState(currentUser?.username || '');
  const [profileImage, setProfileImage] = useState(currentUser?.profileImage || '');
  const [localError, setLocalError] = useState('');

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLocalError('이미지 파일만 선택할 수 있습니다.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLocalError('프로필 사진은 2MB 이하로 선택해주세요.');
      return;
    }

    setLocalError('');
    setProfileImage(await readImageFile(file));
  };

  const handleSubmit = () => {
    const nextNickname = nickname.trim();
    if (nextNickname.length < 3) {
      setLocalError('닉네임은 3자 이상 입력해주세요.');
      return;
    }
    onSave({ username: nextNickname, profileImage });
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(event) => event.stopPropagation()}>
        <button className="icon-close" type="button" onClick={onClose} aria-label="닫기">
          <FiX />
        </button>
        <h3>프로필 수정</h3>

        <div className="profile-preview">
          {profileImage ? <img src={profileImage} alt="프로필 미리보기" /> : <FiUser />}
        </div>

        <div className="profile-actions">
          <label className="file-btn">
            <FiCamera />
            <span>사진 변경</span>
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </label>
          {profileImage && (
            <button type="button" className="ghost-btn" onClick={() => setProfileImage('')}>
              <FiTrash2 />
              <span>삭제</span>
            </button>
          )}
        </div>

        <label className="field-label" htmlFor="nickname">닉네임</label>
        <input
          id="nickname"
          value={nickname}
          onChange={(event) => {
            setNickname(event.target.value);
            setLocalError('');
          }}
          placeholder="닉네임을 입력하세요"
        />

        {(localError || error) && <p className="modal-error">{localError || error}</p>}

        <ButtonGroup>
          <button type="button" className="cancel" onClick={onClose}>취소</button>
          <button type="button" className="save" onClick={handleSubmit} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};

export default ProfileEditModal;
