/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable import/no-default-export */
import { Router } from 'express';

import { ImageQuizController } from './image-quiz/image-quiz.controller';
import { QuizController } from './quiz/quiz.controller';

const GameListRouter = Router();

GameListRouter.use('/image-quiz', ImageQuizController);
GameListRouter.use('/quiz', QuizController);

export default GameListRouter;
