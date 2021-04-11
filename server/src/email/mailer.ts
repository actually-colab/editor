// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import nodemailer from 'nodemailer';

import workshopSharedHTML from '../static/email-templates/workshop-shared';

const senderAddress = process.env['MAIL_USERNAME'];
const emailTransporter = nodemailer.createTransport({
  host: process.env['MAIL_HOST'],
  port: 587,
  auth: {
    user: senderAddress,
    pass: process.env['MAIL_PASSWORD'],
  },
});

export const sendEmails = async (
  emails: string[],
  subject: string,
  text: string,
  html: string
): Promise<void> => {
  if (process.env.IS_OFFLINE) {
    console.log('Skipping sendEmail in offline mode');
    return;
  }

  await emailTransporter.sendMail({
    from: `Actually Colab <${senderAddress}>`,
    to: emails,
    subject,
    text,
    html,
  });
};

export const sendWorkshopSharedEmail = async (
  emails: string[],
  triggered_by_name: string,
  workshop_name: string,
  description: string
): Promise<void> => {
  const subject = `${triggered_by_name} has invited you to their workshop ${workshop_name}`;
  const text = [
    subject,
    description,
    'Check it out at https://app.actuallycolab.org',
  ].join('\n');
  const html = workshopSharedHTML(triggered_by_name, workshop_name, description);
  await sendEmails(emails, subject, text, html);
};
