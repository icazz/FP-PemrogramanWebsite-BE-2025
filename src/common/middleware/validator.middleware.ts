/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import { StatusCodes } from 'http-status-codes';
import multer, { type Field } from 'multer';
import { type ZodType } from 'zod';

import { ErrorResponse } from '../response';

function multerToFile(file: Express.Multer.File): File {
  return new File([new Uint8Array(file.buffer)], file.originalname, {
    type: file.mimetype,
    lastModified: Date.now(),
  });
}

/**
 * Middleware untuk validasi request body.
 * @param {Object} options
 * @param {ZodType<T>} options.schema - Skema Zod untuk validasi
 * @param {Field[]} options.file_fields - Field multer, contoh: [{ name: "profile_picture", maxCount: 1 }, { name: "display_images", maxCount: 5 }]
 * @returns Middleware Express
 */
export const validateBody = <T>({
  schema,
  file_fields = [],
}: {
  schema: ZodType<T>;
  file_fields?: Field[];
}) => {
  const upload = multer({ storage: multer.memoryStorage() });
  const middlewares: RequestHandler[] = [];

  if (file_fields.length > 0) {
    middlewares.push(upload.fields(file_fields));
  }

  middlewares.push((request: Request, _: Response, next: NextFunction) => {
    try {
      const filesData =
        file_fields.length > 0
          ? Object.fromEntries(
              Object.entries(request.files || {}).map(([key, value]) => [
                key,
                Array.isArray(value) && value.length > 1
                  ? value.map(item => multerToFile(item))
                  : multerToFile(value[0]),
              ]),
            )
          : {};

      const checkedData: unknown = {
        ...request.body,
        ...filesData,
      };

      const result = schema.safeParse(checkedData);

      if (!result.success) {
        const errors = result.error;

        throw new ErrorResponse(
          StatusCodes.UNPROCESSABLE_ENTITY,
          errors.message,
        );
      }

      request.body = result.data;

      next();
    } catch (error) {
      return next(error);
    }
  });

  return middlewares;
};
