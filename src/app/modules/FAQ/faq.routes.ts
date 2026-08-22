/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { NextFunction, Request, Response } from 'express';



import { USER_ROLE } from '../Auth/auth.constant';

import { FaqControllers } from './faq.controller';
import auth from '../../middleware/auth';


const router = express.Router();

router.post(
  '/create-faq',
  /*
    #swagger.tags = ['FAQ']
    #swagger.summary = 'Create FAQ entry (Admin)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $question: 'How do I book a vendor service?',
        $answer: 'You can search for vendors, select a service package, and click Request Quote.'
      }
    }
  */
  auth(USER_ROLE.superAdmin,USER_ROLE.admin),
  FaqControllers.createFAQ,
);

router.get('/allFaq',
  /*
    #swagger.tags = ['FAQ']
    #swagger.summary = 'Get all FAQs'
  */
  FaqControllers.getAllFaq
);

router.get('/single-faq/:id',
  /*
    #swagger.tags = ['FAQ']
    #swagger.summary = 'Get single FAQ entry'
  */
  FaqControllers.getSingleFAQ
);

router.delete('/delete-faq/:id',
  /*
    #swagger.tags = ['FAQ']
    #swagger.summary = 'Delete FAQ entry'
  */
  FaqControllers.deleteFaq
);

router.patch('/update-faq/:id',
  /*
    #swagger.tags = ['FAQ']
    #swagger.summary = 'Update FAQ entry'
    #swagger.parameters['body'] = {
      in: 'body',
      schema: {
        question: 'Updated Question?',
        answer: 'Updated Answer.'
      }
    }
  */
  FaqControllers.editFaq
);

export const FaqRoutes = router;
