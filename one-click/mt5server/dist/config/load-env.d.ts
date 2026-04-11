/**
 * 加载顺序：`.env` → `.env.<NODE_ENV>`（若存在则覆盖）。
 * 未设置 `NODE_ENV` 时按 `development` 解析，使 `npm run dev` 能读到 `.env.development`。
 */
export declare function loadEnv(cwd?: string): void;
//# sourceMappingURL=load-env.d.ts.map