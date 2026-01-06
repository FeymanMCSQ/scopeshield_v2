/**
 * PaymentsService
 * Owns: Payment orchestration (checkout flows, webhook handling).
 * Does NOT own: Stripe implementation details, ticket persistence logic.
 * Layer: Application
 * Trust zone: none (methods enforce their own checks)
 */

import { PaymentPort } from './paymentPort';
import { TicketService } from '../ticketService'; // Adjust path if needed
import { asTicketId, asTicketPublicId } from '@/domain/shared';
import { PaymentError } from './errors';
import { DomainError } from '@/domain/shared';

export class PaymentsService {
  constructor(
    private readonly deps: {
      paymentPort: PaymentPort;
      ticketService: TicketService;
      baseUrl: string;
    }
  ) {}

  /**
   * startPublicCheckout
   * Orchestrates the creation of a checkout session for a public ticket.
   */
  async startPublicCheckout(publicId: string): Promise<{ url: string }> {
    // 1. Resolve and validate ticket exists
    // The ticketService.getPublicTicket will throw NOT_FOUND if missing.
    // The ticketService.getPublicTicket takes a TicketPublicId, so we cast/validate in the service or assume route passed string?
    // User requirement: "Application layer is responsible for converting... IDs"
    // Ideally usage: ticketService.getPublicTicket(asTicketPublicId(publicId))
    // We'll trust the publicId is safe to cast or let validation happen during lookup.
    // However, asTicketPublicId is just a brand.
    
    // We need to import asTicketPublicId.
    // wait, I only imported asTicketId. I need asTicketPublicId too.
    
    const ticket = await this.deps.ticketService.getPublicTicket(asTicketPublicId(publicId)); 

    // 2. Validate eligibility
    if (ticket.status === 'PAID') {
      // Use DomainError or specific error. User said "Ticket not eligible -> 409... DomainError"
      throw new DomainError('CONFLICT', 'Ticket is already paid.');
    }
    // Add other status checks if needed (e.g. CANCELED?)

    // 3. Create checkout session
    const successUrl = `${this.deps.baseUrl}/public/ticket/${ticket.publicId}/success`;
    const cancelUrl = `${this.deps.baseUrl}/public/ticket/${ticket.publicId}`;

    const session = await this.deps.paymentPort.createCheckoutSession({
      amountCents: ticket.priceCents,
      currency: 'usd', // Could be config
      successUrl,
      cancelUrl,
      metadata: {
        ticketId: ticket.id,
        publicId: ticket.publicId,
      },
    });

    return { url: session.url };
  }

  /**
   * handleWebhook
   *Verifies event and updates ticket status if payment succeeded.
   */
  async handleWebhook(body: string | Buffer, signature: string): Promise<void> {
    const event = await this.deps.paymentPort.verifyAndParseEvent(body, signature);

    if (event.type === 'checkout.session.completed') {
      const ticketIdStr = event.metadata?.ticketId;
      if (!ticketIdStr) {
        // Log warning?
        return;
      }

      const ticketId = asTicketId(ticketIdStr);
      await this.deps.ticketService.markPaid(ticketId);
    } else {
       // Ignore other events (200 OK)
       // Implementation detail: we just return void, controller returns 200.
    }
  }
}
