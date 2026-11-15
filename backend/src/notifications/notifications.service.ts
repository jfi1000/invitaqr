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
import { staffAccessTemplate } from './templates/staff-access.template';
import { staffInviteTemplate } from './templates/staff-invite.template';
import { waitlistTemplate } from './templates/waitlist.template';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  async sendRsvpInvite(guest: Guest, pass: Pass, event: Event): Promise<void> {
    const url = this.rsvpUrl(pass.rsvpToken);
    const when = this.formatWhen(event.startsAt);
    const place =
      [event.venueName?.trim(), event.location?.trim()].filter(Boolean).join(' · ') ||
      'lugar por confirmar';
    await this.sendEmail(
      guest.email ?? '',
      `${guest.name.split(/\s+/)[0] || guest.name}, te esperan en ${event.name}`,
      rsvpInviteTemplate({
        guestName: guest.name,
        eventName: event.name,
        when,
        venueName: event.venueName,
        location: event.location,
        rsvpUrl: url,
      }),
      [
        `Hola ${guest.name},`,
        '',
        `Hay un lugar guardado con tu nombre en ${event.name}.`,
        `Cuándo: ${when}`,
        `Dónde: ${place}`,
        '',
        `Confirma aquí: ${url}`,
        '',
        'Tu enlace es personal. Si no puedes ir, también puedes avisarnos desde ahí.',
        '',
        '— InvitaQR',
      ].join('\n'),
    );
    await this.sendProWhatsApp(
      guest,
      event,
      `Hola ${guest.name}. Te esperan en ${event.name} el ${when}. Confirma aquí: ${url}`,
    );
  }

  async sendConfirmation(guest: Guest, pass: Pass, event: Event): Promise<void> {
    const when = this.formatWhen(event.startsAt);
    const qrDataUrl = await this.qrImage(pass.qrToken);
    await this.sendEmail(
      guest.email ?? '',
      `Listo: tu lugar en ${event.name} está confirmado`,
      rsvpConfirmedTemplate({
        guestName: guest.name,
        eventName: event.name,
        when,
        venueName: event.venueName,
        location: event.location,
        companions: pass.companionsConfirmed,
        qrDataUrl,
      }),
      [
        `Hola ${guest.name},`,
        '',
        `Tu lugar en ${event.name} quedó confirmado.`,
        `Cuándo: ${when}`,
        [event.venueName, event.location].filter(Boolean).length
          ? `Dónde: ${[event.venueName, event.location].filter(Boolean).join(' · ')}`
          : '',
        '',
        'Tu código QR de acceso llegó en la versión HTML de este correo.',
        '',
        '— InvitaQR',
      ]
        .filter(Boolean)
        .join('\n'),
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
      `Gracias por avisar sobre ${event.name}`,
      rsvpDeclinedTemplate({
        guestName: guest.name,
        eventName: event.name,
      }),
      [
        `Hola ${guest.name},`,
        '',
        `Registramos que no podrás asistir a ${event.name}. Gracias por avisar.`,
        '',
        '— InvitaQR',
      ].join('\n'),
    );
  }

  async sendWaitlist(guest: Guest, event: Event): Promise<void> {
    const when = this.formatWhen(event.startsAt);
    await this.sendEmail(
      guest.email ?? '',
      `Quedaste en lista de espera para ${event.name}`,
      waitlistTemplate({
        guestName: guest.name,
        eventName: event.name,
        when,
      }),
      [
        `Hola ${guest.name},`,
        '',
        `${event.name} se llenó, pero quedaste en lista de espera.`,
        `Fecha: ${when}`,
        '',
        'Si se libera un lugar, te escribimos de inmediato.',
        '',
        '— InvitaQR',
      ].join('\n'),
    );
  }

  async sendStaffInvite(params: {
    staffName: string;
    staffEmail: string;
    eventName: string;
    inviteToken: string;
  }): Promise<void> {
    const staffPwaUrl = this.staffPwaBase();
    const activateUrl = `${staffPwaUrl}/set-password?token=${params.inviteToken}`;
    const loginUrl = staffPwaUrl;
    await this.sendEmail(
      params.staffEmail,
      `Activa tu acceso para ${params.eventName}`,
      staffInviteTemplate({
        staffName: params.staffName,
        eventName: params.eventName,
        activateUrl,
        loginUrl,
      }),
      [
        `Hola ${params.staffName},`,
        '',
        `Fuiste invitado como personal de acceso en ${params.eventName}.`,
        '',
        `Activa tu cuenta aquí: ${activateUrl}`,
        `Cuando ya la actives, entra a escanear: ${loginUrl}`,
        '',
        'Este enlace expira en 48 horas.',
        '',
        '— InvitaQR',
      ].join('\n'),
    );
  }

  async sendStaffAccess(params: {
    staffName: string;
    staffEmail: string;
    eventName: string;
  }): Promise<void> {
    const loginUrl = this.staffPwaBase();
    await this.sendEmail(
      params.staffEmail,
      `Entra a escanear ${params.eventName}`,
      staffAccessTemplate({
        staffName: params.staffName,
        eventName: params.eventName,
        loginUrl,
      }),
      [
        `Hola ${params.staffName},`,
        '',
        `Tu acceso para ${params.eventName} está listo.`,
        `Entra a escanear aquí: ${loginUrl}`,
        '',
        '— InvitaQR',
      ].join('\n'),
    );
  }

  async sendReminder(guest: Guest, pass: Pass, event: Event): Promise<void> {
    const when = this.formatWhen(event.startsAt);
    const qrDataUrl = await this.qrImage(pass.qrToken);
    await this.sendEmail(
      guest.email ?? '',
      `${event.name} es pronto — ten tu pase a la mano`,
      rsvpReminderTemplate({
        guestName: guest.name,
        eventName: event.name,
        when,
        venueName: event.venueName,
        location: event.location,
        qrDataUrl,
      }),
      [
        `Hola ${guest.name},`,
        '',
        `${event.name} es en las próximas 24 horas (${when}).`,
        'Lleva el código QR que recibiste al confirmar.',
        '',
        '— InvitaQR',
      ].join('\n'),
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
    text?: string,
  ): Promise<void> {
    const recipient = to.trim();
    if (!recipient) {
      this.logger.warn(`Correo omitido (${subject}): el invitado no tiene email`);
      return;
    }

    const host = this.config.get<string>('SMTP_HOST')?.trim();
    if (!host) {
      this.logger.warn(`Correo no enviado a ${recipient}: falta SMTP_HOST`);
      throw new Error('Falta configurar SMTP_HOST');
    }

    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const smtpUser = this.config.get<string>('SMTP_USER')?.trim() || '';
    const fromRaw =
      this.config.get<string>('SMTP_FROM')?.trim() ||
      smtpUser ||
      'InvitaQR <noreply@invitaqr.com>';
    const from = this.parseFrom(fromRaw, smtpUser);

    try {
      const info = await this.mailer(host, port).sendMail({
        from,
        sender: smtpUser || from.address,
        replyTo: smtpUser || from.address,
        to: recipient,
        subject,
        text:
          text ||
          'Abre este correo en un cliente que soporte HTML para ver tu invitación InvitaQR.',
        html,
        headers: {
          'X-InvitaQR-Mail': 'rsvp',
        },
      });
      this.logger.log(
        `Correo enviado a ${recipient}: ${subject} (id=${info.messageId ?? 'n/a'} accepted=${JSON.stringify(info.accepted ?? [])})`,
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(`SMTP falló hacia ${recipient}: ${detail}`);
      throw error instanceof Error ? error : new Error(detail);
    }
  }

  private parseFrom(
    value: string,
    fallbackAddress: string,
  ): { name: string; address: string } {
    const match = value.match(/^(.*?)\s*<([^>]+)>$/);
    if (match) {
      return {
        name: match[1].replace(/^["']|["']$/g, '').trim() || 'InvitaQR',
        address: match[2].trim(),
      };
    }
    if (value.includes('@')) {
      return { name: 'InvitaQR', address: value };
    }
    return {
      name: 'InvitaQR',
      address: fallbackAddress || 'noreply@invitaqr.com',
    };
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

  private staffPwaBase(): string {
    return (
      this.config.get<string>('STAFF_PWA_URL') || 'http://localhost:5173'
    ).replace(/\/$/, '');
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
