import { Router } from 'express';

import { AuthController } from './auth/auth.controller';
import { GameController } from './game/game.controller';
import { router as openTheBoxRouter } from './game/game-list/open-the-box/router';
import { UserController } from './user/user.controller';

const appRouter = Router();

appRouter.use('/auth', AuthController);
appRouter.use('/user', UserController);

appRouter.use('/game/game-list/open-the-box', openTheBoxRouter);

appRouter.use('/game', GameController);

export { appRouter };
