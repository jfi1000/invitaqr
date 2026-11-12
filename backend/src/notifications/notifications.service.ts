import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import { Event } from '../events/event.entity';
import { EventPlan } from '../events/event-plan.enum';
import { Guest } from '../guests/guest.entity';
import { Pass } from '../guests/pass.entity';
import { rsvpConfirmedTemplate } from './templates/rsvp-confirmed.template';
import { rsvpDeclinedTemplate } from './templates/rsvp-declined.template';
import { rsvpInviteTemplate } from './templates/rsvp-invite.template';
import { rsvpReminderTemplate } from './templates/rsvp-reminder.template';
import { waitlistTemplate } from './templates/waitlist.template';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  async sendRsvpInvite(guest: Guest, pass: Pass, event: Event): Promise<void> {
    const url = this.rsvpUrl(pass.rsvpToken);
    const when = this.formatWhen(event.startsAt);
    await this.sendEmail(
      guest.email ?? '',
      `Invitación: ${event.name}`,
      rsvpInviteTemplate({
        guestName: guest.name,
        eventName: event.name,
        when,
        location: event.location,
        rsvpUrl: url,
      }),
    );
    await this.sendProWhatsApp(
      guest,
      event,
      `Hola ${guest.name}. Te invitaron a ${event.name} el ${when}. Confirma aquí: ${url}`,
    );
  }

  async sendConfirmation(guest: Guest, pass: Pass, event: Event): Promise<void> {
    const when = this.formatWhen(event.startsAt);
    const qrDataUrl = await this.qrImage(pass.qrToken);
    await this.sendEmail(
      guest.email ?? '',
      `Tu acceso está confirmado: ${event.name}`,
      rsvpConfirmedTemplate({
        guestName: guest.name,
        eventName: event.name,
        when,
        location: event.location,
        companions: pass.companionsConfirmed,
        qrDataUrl,
      }),
    );
    await this.sendProWhatsApp(
      guest,
      event,
      `Hola ${guest.name}. Tu lugar en ${event.name} está confirmado. El código QR de acceso llegó a tu correo.`,
    );
  }

  async sendDeclined(guest: Guest, event: Event): Promise<void> {
    await this.sendEmail(
      guest.email ?? '',
      `Respuesta registrada: ${event.name}`,
      rsvpDeclinedTemplate({
        guestName: guest.name,
        eventName: event.name,
      }),
    );
  }

  async sendWaitlist(guest: Guest, event: Event): Promise<void> {
    await this.sendEmail(
      guest.email ?? '',
      `Lista de espera: ${event.name}`,
      waitlistTemplate({
        guestName: guest.name,
        eventName: event.name,
        when: this.formatWhen(event.startsAt),
      }),
    );
  }

  async sendReminder(guest: Guest, pass: Pass, event: Event): Promise<void> {
    const when = this.formatWhen(event.startsAt);
    const qrDataUrl = await this.qrImage(pass.qrToken);
    await this.sendEmail(
      guest.email ?? '',
      `Recordatorio: ${event.name} es pronto`,
      rsvpReminderTemplate({
        guestName: guest.name,
        eventName: event.name,
        when,
        location: event.location,
        qrDataUrl,
      }),
    );
    await this.sendProWhatsApp(
      guest,
      event,
      `Hola ${guest.name}. ${event.name} es en las próximas 24 horas (${when}). Lleva el código QR que recibiste por correo.`,
    );
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    const recipient = to.trim();
    if (!recipient) {
      this.logger.warn(`Correo omitido (${subject}): el invitado no tiene email`);
      return;
    }

    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      this.logger.warn(`Correo no enviado a ${recipient}: falta SMTP_HOST`);
      return;
    }

    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const from =
      this.config.get<string>('SMTP_FROM') ||
      this.config.get<string>('SMTP_USER') ||
      'InvitaQR <noreply@invitaqr.com>';

    await this.mailer(host, port).sendMail({ from, to: recipient, subject, html });
  }

  private async sendWhatsApp(phone: string, message: string): Promise<void> {
    const apiKey = this.config.get<string>('WHATSAPP_API_KEY');
    if (!apiKey) {
      return;
    }

    const base = (
      this.config.get<string>('WHATSAPP_BASE_URL') ||
      'https://waba.360dialog.io/v1'
    ).replace(/\/$/, '');
    const to = this.whatsAppRecipient(phone);

    try {
      const response = await fetch(`${base}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'D360-API-KEY': apiKey,
        },
        body: JSON.stringify({
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { body: message },
        }),
      });
      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`WhatsApp respondió ${response.status}: ${body}`);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(`WhatsApp no disponible: ${detail}`);
    }
  }

  private async sendProWhatsApp(
    guest: Guest,
    event: Event,
    message: string,
  ): Promise<void> {
    if (event.plan !== EventPlan.PRO || !guest.phone) {
      return;
    }
    await this.sendWhatsApp(guest.phone, message);
  }

  private mailer(host: string, port: number): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });
    }
    return this.transporter;
  }

  private async qrImage(qrToken: string | null): Promise<string | null> {
    if (!qrToken) {
      return null;
    }
    return QRCode.toDataURL(qrToken, {
      errorCorrectionLevel: 'L',
      margin: 1,
      width: 360,
      type: 'image/png',
    });
  }

  private rsvpUrl(rsvpToken: string): string {
    const appUrl = (
      this.config.get<string>('APP_URL') || 'http://localhost:3000'
    ).replace(/\/$/, '');
    return `${appUrl}/rsvp/${rsvpToken}`;
  }

  private formatWhen(date: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'America/Mexico_City',
    }).format(date);
  }

  private whatsAppRecipient(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `52${digits}`;
    }
    return digits;
  }
}
