import { AnyZodObject, ZodEffects } from 'zod';
import { NextFunction, Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';

const validateRequest = (schema: AnyZodObject | ZodEffects<any>) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // validation
 
    // console.log(req?.body);
    const verifiedData = await schema.parseAsync({
      ...req.body,
      // ...req.cookies,
    });
    // req.body = verifiedData.body;
    req.body = verifiedData;
    next();
  });
};

export default validateRequest;
