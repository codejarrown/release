import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
/**
 * 加载顺序：`.env` → `.env.<NODE_ENV>`（若存在则覆盖）。
 * 未设置 `NODE_ENV` 时按 `development` 解析，使 `npm run dev` 能读到 `.env.development`。
 */
export function loadEnv(cwd = process.cwd()) {
    config({ path: resolve(cwd, '.env') });
    const mode = process.env.NODE_ENV || 'development';
    const modeFile = resolve(cwd, `.env.${mode}`);
    if (existsSync(modeFile)) {
        config({ path: modeFile, override: true });
    }
}
//# sourceMappingURL=load-env.js.map