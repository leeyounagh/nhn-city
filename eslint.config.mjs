import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // 게임 스프라이트(건물·초상화·자재·아이소맵 타일)는 raw <img>가 의도된 선택이다.
    // 아이소맵 스프라이트는 런타임 동적 치수 + clip-path 다이아몬드 + transform 반전 + 절대배치를 쓰고,
    // 초상화는 onError로 GameIcon(SVG) 폴백을 갈아끼운다. 에셋은 이미 다운스케일된 정적 파일이라
    // next/image 최적화 이득이 없고 오히려 렌더를 방해한다. 따라서 이 규칙을 끈다.
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
