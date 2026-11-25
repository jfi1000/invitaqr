import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { DataSource, Repository } from 'typeorm';
import { Event } from '../events/event.entity';
import { EventPlan } from '../events/event-plan.enum';
import { EventStatus } from '../events/event-status.enum';
import { User } from '../users/user.entity';
import { UserRole } from '../users/user-role.enum';
import { PaidPlan, Payment } from './payment.entity';
import { PaymentStatus } from './payment-status.enum';

const PLAN_AMOUNT: Record<PaidPlan, number> = {
  BASIC: 29900,
  PRO: 59900,
};

const PLAN_CAPACITY: Record<PaidPlan, number> = {
  BASIC: 150,
  PRO: 500,
};

const PLAN_RANK: Record<PaidPlan, number> = {
  BASIC: 1,
  PRO: 2,
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripeClient: Stripe | null = null;

  constructor(
    @InjectRepository(Payment)
    private readonly payments: Repository<Payment>,
    @InjectRepository(Event)
    private readonly events: Repository<Event>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async createCheckoutSession(
    eventId: string,
    plan: PaidPlan,
    userId: string,
    returnUrls?: { successUrl?: string; cancelUrl?: string },
  ): Promise<{ url: string }> {
    const event = await this.requireDraftEvent(eventId, userId);
    const paid = await this.payments.findOne({
      where: { eventId: event.id, status: PaymentStatus.PAID },
    });
    if (paid && PLAN_RANK[plan] <= PLAN_RANK[paid.plan]) {
      throw new ConflictException({
        error: 'PAYMENT_ALREADY_COMPLETED',
        message:
          paid.plan === plan
            ? 'Este evento ya tiene ese paquete'
            : 'Este evento ya tiene un paquete superior',
      });
    }

    const successUrl = this.returnUrl(
      returnUrls?.successUrl,
      'success',
      event.id,
      plan,
    );
    const cancelUrl = this.returnUrl(
      returnUrls?.cancelUrl,
      'cancel',
      event.id,
      plan,
    );
    const session = await this.stripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: this.priceId(plan), quantity: 1 }],
      metadata: { eventId: event.id, plan },
      client_reference_id: event.id,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.url) {
      throw new InternalServerErrorException({
        error: 'STRIPE_SESSION_FAILED',
        message: 'Stripe no devolvió la URL de pago',
      });
    }

    await this.payments.save(
      this.payments.create({
        eventId: event.id,
        stripeSessionId: session.id,
        stripePaymentId: null,
        plan,
        amount: PLAN_AMOUNT[plan],
        currency: 'MXN',
        status: PaymentStatus.PENDING,
        paidAt: null,
      }),
    );

    return { url: session.url };
  }

  async listPurchases(
    userId: string,
    role: UserRole,
  ): Promise<
    {
      id: string;
      eventId: string;
      eventName: string;
      plan: PaidPlan;
      amount: number;
      currency: string;
      paidAt: string | null;
    }[]
  > {
    const rows: {
      id: string;
      eventId: string;
      eventName: string;
      plan: string;
      amount: number;
      currency: string;
      paidAt: Date | string | null;
    }[] = await this.dataSource.query(
      `SELECT p.id,
              p.event_id AS "eventId",
              e.name AS "eventName",
              p.plan,
              p.amount,
              p.currency,
              p.paid_at AS "paidAt"
       FROM payments p
       INNER JOIN events e ON e.id = p.event_id
       WHERE p.status = 'PAID'
         AND ($1::varchar = 'OWNER' OR e.owner_id = $2::uuid)
       ORDER BY p.paid_at DESC NULLS LAST, p.created_at DESC`,
      [role, userId],
    );

    return rows.flatMap((row) => {
      if (row.plan !== 'BASIC' && row.plan !== 'PRO') return [];
      return [
        {
          id: row.id,
          eventId: row.eventId,
          eventName: row.eventName,
          plan: row.plan,
          amount: Number(row.amount),
          currency: (row.currency || 'MXN').toUpperCase(),
          paidAt: row.paidAt ? new Date(row.paidAt).toISOString() : null,
        },
      ];
    });
  }

  async handleWebhook(
    rawBody: Buffer,
    signature: string,
  ): Promise<{ received: true }> {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret || !signature || !Buffer.isBuffer(rawBody)) {
      this.logger.warn('Webhook de Stripe rechazado: falta firma o cuerpo');
      throw new BadRequestException({
        error: 'INVALID_SIGNATURE',
        message: 'La firma del webhook no es válida',
      });
    }

    let stripeEvent: Stripe.Event;
    try {
      stripeEvent = this.stripe().webhooks.constructEvent(
        rawBody,
        signature,
        secret,
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Firma de Stripe inválida: ${detail}`);
      throw new BadRequestException({
        error: 'INVALID_SIGNATURE',
        message: 'La firma del webhook no es válida',
      });
    }

    if (stripeEvent.type !== 'checkout.session.completed') {
      return { received: true };
    }

    const session = stripeEvent.data.object as Stripe.Checkout.Session;
    await this.markCheckoutPaid(session);
    return { received: true };
  }

  private async markCheckoutPaid(session: Stripe.Checkout.Session): Promise<void> {
    const eventId = session.metadata?.eventId;
    const plan = this.paidPlan(session.metadata?.plan);
    if (!eventId || !plan) {
      this.logger.error(
        `Checkout ${session.id} sin eventId o plan en metadata`,
      );
      return;
    }

    const paymentIntentId = this.paymentIntentId(session);
    await this.dataSource.transaction(async (manager) => {
      const payments = manager.getRepository(Payment);
      const events = manager.getRepository(Event);
      let payment = await payments.findOne({
        where: { stripeSessionId: session.id },
      });
      const paidAt = new Date();
      if (!payment) {
        payment = payments.create({
          eventId,
          stripeSessionId: session.id,
          stripePaymentId: paymentIntentId,
          plan,
          amount: session.amount_total ?? PLAN_AMOUNT[plan],
          currency: (session.currency ?? 'mxn').toUpperCase(),
          status: PaymentStatus.PAID,
          paidAt,
        });
      } else {
        payment.status = PaymentStatus.PAID;
        payment.paidAt = payment.paidAt ?? paidAt;
        payment.stripePaymentId = paymentIntentId ?? payment.stripePaymentId;
        payment.plan = plan;
        if (typeof session.amount_total === 'number') {
          payment.amount = session.amount_total;
        }
        if (session.currency) {
          payment.currency = session.currency.toUpperCase();
        }
      }
      await payments.save(payment);
      await events.update(eventId, {
        plan: plan as EventPlan,
        capacity: PLAN_CAPACITY[plan],
      });
    });
  }

  private async requireDraftEvent(
    eventId: string,
    userId: string,
  ): Promise<Event> {
    const event = await this.events.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException({
        error: 'EVENT_NOT_FOUND',
        message: 'Evento no encontrado',
      });
    }

    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || user.role === UserRole.STAFF) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: 'No puedes pagar este evento',
      });
    }
    if (user.role === UserRole.PLANNER && event.ownerId !== userId) {
      throw new NotFoundException({
        error: 'EVENT_NOT_FOUND',
        message: 'Evento no encontrado',
      });
    }
    if (
      event.status === EventStatus.CLOSED ||
      event.status === EventStatus.CANCELLED
    ) {
      throw new BadRequestException({
        error: 'EVENT_NOT_PAYABLE',
        message: 'No se puede pagar un evento cerrado o cancelado',
      });
    }
    return event;
  }

  private returnUrl(
    raw: string | undefined,
    kind: 'success' | 'cancel',
    eventId: string,
    plan: PaidPlan,
  ): string {
    const appUrl = (
      this.config.get<string>('APP_URL') || 'http://localhost:3000'
    ).replace(/\/$/, '');
    const fallback =
      kind === 'success'
        ? `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&event_id=${eventId}&plan=${plan}`
        : `${appUrl}/payment/cancel?event_id=${eventId}`;
    const value = raw?.trim();
    if (!value) return fallback;
    if (value.length > 500 || !this.isAppReturnUrl(value, kind, eventId)) {
      throw new BadRequestException({
        error: 'INVALID_RETURN_URL',
        message: 'La dirección de regreso a la app no es válida',
      });
    }
    return value;
  }

  private isAppReturnUrl(
    value: string,
    kind: 'success' | 'cancel',
    eventId: string,
  ): boolean {
    if (kind === 'success' && !value.includes('session_id={CHECKOUT_SESSION_ID}')) {
      return false;
    }
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return false;
    }
    const route = `${url.hostname}${url.pathname}`.toLowerCase();
    const expected = kind === 'success' ? 'payment/success' : 'payment/cancel';
    if (!route.includes(expected) || url.searchParams.get('event_id') !== eventId) {
      return false;
    }
    const protocol = url.protocol.replace(':', '').toLowerCase();
    if (protocol === 'invitaqr' || protocol === 'exp' || protocol === 'exps') {
      return true;
    }
    if (protocol !== 'http' && protocol !== 'https') return false;
    const appUrl = (
      this.config.get<string>('APP_URL') || 'http://localhost:3000'
    ).replace(/\/$/, '');
    let allowed: URL | null = null;
    try {
      allowed = new URL(appUrl);
    } catch {
      allowed = null;
    }
    if (allowed && url.origin === allowed.origin) return true;
    const host = url.hostname;
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
    );
  }

  private stripe(): Stripe {
    if (this.stripeClient) {
      return this.stripeClient;
    }
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!key) {
      throw new InternalServerErrorException({
        error: 'STRIPE_NOT_CONFIGURED',
        message: 'Stripe no está configurado',
      });
    }
    this.stripeClient = new Stripe(key);
    return this.stripeClient;
  }

  private priceId(plan: PaidPlan): string {
    const key = plan === 'BASIC' ? 'STRIPE_PRICE_BASIC' : 'STRIPE_PRICE_PRO';
    const price = this.config.get<string>(key);
    if (!price) {
      throw new InternalServerErrorException({
        error: 'STRIPE_NOT_CONFIGURED',
        message: 'Falta el precio de Stripe para este plan',
      });
    }
    return price;
  }

  private paidPlan(value: string | undefined): PaidPlan | null {
    if (value === 'BASIC' || value === 'PRO') {
      return value;
    }
    return null;
  }

  private paymentIntentId(session: Stripe.Checkout.Session): string | null {
    if (typeof session.payment_intent === 'string') {
      return session.payment_intent;
    }
    return session.payment_intent?.id ?? null;
  }
}
