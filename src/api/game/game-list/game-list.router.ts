import { Router } from 'express';

import airplaneRouter from './airplane/airplane.router';
import { AnagramController } from './anagram/anagram.controller';
import { CrosswordController } from './crossword/crossword.controller';
import { FindTheMatchController } from './find-the-match/find-the-match.controller';
import { ImageQuizController } from './image-quiz/image-quiz.controller';
import { MazeChaseController } from './maze-chase/maze-chase.controller';
import { PairOrNoPairController } from './pair-or-no-pair/pair-or-no-pair.controller';
import { QuizController } from './quiz/quiz.controller';
import { SlidingPuzzleController } from './sliding-puzzle/sliding-puzzle.controller';
import { SpeedSortingController } from './speed-sorting/speed-sorting.controller';
import { SpinTheWheelController } from './spin-the-wheel/spin-the-wheel.controller';
import { TrueOrFalseController } from './true-or-false/true-or-false.controller';
import { TypeSpeedController } from './type-speed/type-speed.controller';
import { WhackAMoleController } from './whack-a-mole/whack-a-mole.controller';

const gameListRouter = Router();

gameListRouter.use('/image-quiz', ImageQuizController);
gameListRouter.use('/quiz', QuizController);
gameListRouter.use('/quiz', QuizController);
gameListRouter.use('/maze-chase', MazeChaseController);
gameListRouter.use('/sliding-puzzle', SlidingPuzzleController);
gameListRouter.use('/speed-sorting', SpeedSortingController);
gameListRouter.use('/anagram', AnagramController);

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
gameListRouter.use('/crossword', CrosswordController);
gameListRouter.use('/find-the-match', FindTheMatchController);
gameListRouter.use('/pair-or-no-pair', PairOrNoPairController);
gameListRouter.use('/type-speed', TypeSpeedController);

gameListRouter.use('/airplane', airplaneRouter);

gameListRouter.use('/spin-the-wheel', SpinTheWheelController);
gameListRouter.use('/true-or-false', TrueOrFalseController);
gameListRouter.use('/whack-a-mole', WhackAMoleController);

export { gameListRouter };
