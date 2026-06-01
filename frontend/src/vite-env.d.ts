// TypeScript 변경 표시: Vite 전용 타입과 이미지 import 타입을 알려주는 선언 파일입니다.
/// <reference types="vite/client" />

// TypeScript 변경 표시: PNG 파일을 import할 때 문자열 경로로 다룰 수 있게 알려줍니다.
declare module '*.png' {
  const src: string;
  export default src;
}
