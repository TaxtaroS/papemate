// 초보자 안내: styled-components로 화면의 색상, 간격, 배치 같은 스타일을 정의하는 파일입니다.

import styled from 'styled-components';
import { palette } from '../../shared/palette';

export const AvatarContainer = styled.div<{ $size?: string }>`
  width: ${(props) => props.$size || '40px'};
  height: ${(props) => props.$size || '40px'};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  user-select: none;

  i {
    font-size: ${(props) => props.$size || '40px'};
    color: ${palette.slate[5]};
    transition: color 0.15s;
  }

  i:hover {
    color: ${palette.slate[7]};
  }

  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }
`;
