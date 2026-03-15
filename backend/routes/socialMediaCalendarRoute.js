import { Router } from 'express';
import {
  getCalendars,
  getCalendarByClient,
  createCalendar,
  addPost,
  updatePost,
  deletePost,
} from '../controllers/socialMediaCalendarController.js';

const router = Router();

router.get('/social-calendars', getCalendars);
router.get('/social-calendars/client/:clientId', getCalendarByClient);
router.post('/social-calendars', createCalendar);
router.post('/social-calendars/client/:clientId/posts', addPost);
router.put('/social-calendars/client/:clientId/posts/:postId', updatePost);
router.delete('/social-calendars/client/:clientId/posts/:postId', deletePost);

export default router;
