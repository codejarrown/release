import { loadEnv } from './config/load-env.js';
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import { join } from 'path';
import { existsSync } from 'fs';
import { buildConfig } from './config/index.js';
import { buildAppContext } from './app/index.js';
import { registerSwagger } from './http/swagger.js';
import { registerHealthRoutes } from './http/health.js';
import { registerAccountRoutes } from './http/accounts.js';
import { registerTradingRoutes } from './http/trading.js';
import { registerPositionRoutes } from './http/positions.js';
import { registerStreamRoutes } from './http/stream.js';
import { registerPushRoutes } from './http/push.js';
import { registerAccountGroupRoutes } from './http/account-groups.js';
import { registerOrderGroupRoutes } from './http/order-groups.js';
import { registerSpreadRoutes } from './http/spread.js';
import { registerUtilitiesRoutes } from './http/utilities.js';
import { registerErrorHandler } from './http/error-handler.js';
import { registerAuthHook } from './http/auth.js';
import { registerAuthVerifyRoutes } from './http/auth-verify.js';
import { registerAuthMachineIdRoutes } from './http/auth-machine-id.js';
import { registerMachineLicenseRoutes } from './http/auth-machine-license.js';
async function main() {
    loadEnv();
    const config = buildConfig();
    const ctx = await buildAppContext(config);
    const app = Fastify({
        logger: {
            level: config.LOG_LEVEL,
        },
    });
    await app.register(websocket);
    await registerSwagger(app);
    const bundledStaticRoot = join(process.cwd(), 'dist/static');
    const sourceStaticRoot = join(process.cwd(), 'src/static');
    const staticRoot = existsSync(sourceStaticRoot) ? sourceStaticRoot : bundledStaticRoot;
    await app.register(fastifyStatic, {
        root: staticRoot,
        prefix: '/static/',
        decorateReply: false,
    });
    const webDistDir = config.WEB_DIST_DIR?.trim();
    const webRoot = webDistDir ? join(process.cwd(), webDistDir) : undefined;
    const hasWebDist = Boolean(webRoot && existsSync(join(webRoot, 'index.html')));
    if (webRoot && hasWebDist) {
        await app.register(fastifyStatic, {
            root: webRoot,
            prefix: '/',
            decorateReply: false,
        });
    }
    app.decorate('ctx', ctx);
    registerErrorHandler(app);
    registerAuthHook(app, config.API_SECRET, config.MACHINE_LICENSE_SECRET ?? config.API_SECRET);
    registerHealthRoutes(app);
    registerAuthMachineIdRoutes(app);
    registerAuthVerifyRoutes(app);
    registerMachineLicenseRoutes(app, config.API_SECRET, config.MACHINE_LICENSE_SECRET ?? config.API_SECRET);
    registerAccountRoutes(app, ctx.services.account);
    registerTradingRoutes(app, ctx.services.account, ctx.mt5Sdk);
    registerPositionRoutes(app, ctx.services.account, ctx.mt5Sdk);
    registerStreamRoutes(app, ctx.wsManager, ctx.services.account, ctx.services.spread, ctx.services.orderGroup, ctx.realtime.app);
    registerPushRoutes(app, ctx.services.push);
    registerAccountGroupRoutes(app, ctx.services.accountGroup);
    registerOrderGroupRoutes(app, ctx.services.orderGroup);
    registerSpreadRoutes(app, ctx.services.spread);
    registerUtilitiesRoutes(app, ctx.mt5Sdk);
    if (webRoot && hasWebDist) {
        app.setNotFoundHandler((req, reply) => {
            const url = req.raw.url ?? '';
            const isSpaRoute = req.method === 'GET'
                && !url.startsWith('/api/')
                && !url.startsWith('/docs')
                && !url.startsWith('/static/')
                && !url.startsWith('/health')
                && !url.startsWith('/ws');
            if (isSpaRoute) {
                return reply.type('text/html; charset=utf-8').sendFile('index.html');
            }
            return reply.code(404).send({ message: 'Not Found' });
        });
    }
    const shutdown = async () => {
        app.log.info('Shutting down...');
        ctx.services.accountHeartbeat.close();
        ctx.services.spread.close();
        ctx.wsManager.closeAll();
        await app.close();
        await ctx.db.destroy();
        process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    try {
        await app.listen({ port: config.PORT, host: '0.0.0.0' });
        app.log.info(`Server listening on port ${config.PORT}`);
    }
    catch (err) {
        app.log.error(err, 'Failed to start server');
        process.exit(1);
    }
}
void main();
//# sourceMappingURL=main.js.map