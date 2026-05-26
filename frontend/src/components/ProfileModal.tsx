// TypeScript 변경 표시: JSX가 들어 있는 React 파일이라 .js에서 .tsx로 바꾼 파일입니다.
// TypeScript 변경 표시: 기존 JS 로직은 유지하면서 함수 인자와 화면 props에 실제 타입을 붙여 TypeScript 검사를 통과하게 했습니다.
// 초보자 안내: 화면에서 재사용되는 UI 조각을 정의한 React 컴포넌트 파일입니다.

import React from 'react';
import {
  FooterButtonRow,
  GridBox,
  IconWrapper,
  ModalContainer,
  ProfileActionButton,
  ProfileModalOverlay,
  StatItem,
} from './styles/ProfileModal.styles';

export const ProfileModal = ({ onClose }) => (
  <ProfileModalOverlay onClick={onClose}>
    <ModalContainer onClick={(event) => event.stopPropagation()}>
      <IconWrapper><i className="fa-solid fa-robot"></i></IconWrapper>
      <h3>user14530</h3>
      <ProfileActionButton type="button" $withMargin>Profile Edit</ProfileActionButton>
      <ProfileActionButton type="button">Change Password</ProfileActionButton>

      <GridBox>
        <StatItem>0 Projects</StatItem>
        <StatItem>0 Analysis Questions</StatItem>
        <StatItem>0 Resources</StatItem>
        <StatItem>0 Participating Teams</StatItem>
      </GridBox>

      <FooterButtonRow>
        <button type="button">Logout</button>
        <button className="danger" type="button">Delete Account</button>
      </FooterButtonRow>
    </ModalContainer>
  </ProfileModalOverlay>
);
