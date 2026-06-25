import { render } from '@react-email/render';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { env } from '@/config/env';
import { db } from '@/database/client';
import { contactRequests } from '@/database/schema/campaigns.schema';
import { contactEmails } from '@/database/schema/contacts/communication.schema';
import { contactNewsletter, contacts } from '@/database/schema/contacts/contacts.schema';
import { notifications } from '@/database/schema/notifications.schema';
import { ContactRequestEmail } from '@/emails/contact';
import { nodemailerClient } from '@/lib/nodemailer';
import { queueClient } from '@/lib/queue';

import { contactFormSchema } from './contact.schema';

export const submitContactFn = createServerFn({ method: 'POST' })
  .validator(
    contactFormSchema.extend({
      propertyAddress: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { name, email, phone, message, propertyAddress } = data;
    const subject = propertyAddress ? `Contact Request | ${propertyAddress}` : `Contact Request`;

    // Add contact request to database
    const [contactRequest] = await db
      .insert(contactRequests)
      .values({
        name,
        email,
        phone,
        message,
        propertyAddress,
      })
      .returning();

    const [firstName, lastName] = name.split(' ');
    const registeredEmail = await db.query.contactEmails.findFirst({
      where: {
        email,
      },
    });

    let contact = await db.query.contacts.findFirst({
      where: {
        id: {
          eq: registeredEmail?.contactId,
        },
      },
    });

    if (!contact) {
      const [newContact] = await db
        .insert(contacts)
        .values({
          firstName,
          lastName,
        })
        .returning();
      await db
        .insert(contactEmails)
        .values({
          contactId: newContact.id,
          email,
        })
        .onConflictDoNothing();

      contact = newContact;
    }

    await db
      .insert(contactNewsletter)
      .values({
        contactId: contact.id,
        subscribedAt: new Date(),
      })
      .onConflictDoNothing();

    // TODO: Add admin and/or superadmin id to the notification recipients list
    await db.insert(notifications).values({
      type: 'CONTACT_REQUEST',
      title: `${name} has requested to be contacted`,
      message,
      resource_type: 'CONTACT_REQUEST',
      resource_id: contactRequest.id,
    });

    const emailHTML = await render(
      ContactRequestEmail({
        propertyAddress,
        subject,
        name,
        email,
        phone,
        message,
      }),
    );

    await queueClient.enqueue(
      await nodemailerClient.sendMail({
        from: env.EMAIL_FROM,
        to:
          process.env.NODE_ENV === 'production'
            ? 'jonathan@designersimage.io'
            : 'contact@designersimage.io',
        subject,
        html: emailHTML,
      }),
    );
  });
