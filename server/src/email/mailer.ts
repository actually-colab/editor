// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import nodemailer from 'nodemailer';

import workshopSharedHTML from '../static/email-templates/workshop-shared';
import workshopStartedHTML from '../static/email-templates/workshop-started';
import notebookSharedHTML from '../static/email-templates/notebook-shared';

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
    bcc: emails,
    subject,
    text,
    html,
  });
};

export const sendNotebookSharedEmail = async (
  emails: string[],
  triggered_by_name: string,
  notebook_name: string
): Promise<void> => {
  const subject = `${triggered_by_name} has invited you to collaborate on their notebook ${notebook_name}`;
  const text = [subject, 'Check it out at https://app.actuallycolab.org'].join('\n');
  const html = notebookSharedHTML(triggered_by_name, notebook_name);
  await sendEmails(emails, subject, text, html);
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

export const sendWorkshopStartedEmail = async (
  emails: string[],
  workshop_name: string,
  description: string
): Promise<void> => {
  const subject = `The workshop ${workshop_name} has started!`;
  const text = [
    subject,
    description,
    'Check it out at https://app.actuallycolab.org',
  ].join('\n');
  const html = workshopStartedHTML(workshop_name, description);
  await sendEmails(emails, subject, text, html);
};
