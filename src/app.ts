import { Hono } from 'hono'
import { logger } from 'hono/logger';
import { workdays } from '@/routes/workdays';
import { filePrint } from '@/lib/utils/logger';

export const app = new Hono()

app.use('*', logger(filePrint))

app.get("/", (c) => c.text("Hola Capta"));

app.route('/workdays', workdays)