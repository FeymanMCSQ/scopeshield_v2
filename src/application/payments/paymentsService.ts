// /**
//  * PaymentsService
//  * Owns: Payment orchestration (checkout flows, webhook handling).
//  * Does NOT own: Stripe implementation details, ticket persistence logic.
//  * Layer: Application
//  * Trust zone: none (methods enforce their own checks)
//  */

// import { PaymentPort } from './paymentPort';
// import { TicketService } from '../ticketService';
// import { asTicketId, asTicketPublicId, DomainError } from '@/domain/shared';
// import { PaymentError } from './errors';

// export class PaymentsService {
//   constructor(
//     private readonly deps: {
//       paymentPort: PaymentPort;
//       ticketService: TicketService;
//       baseUrl: string;
//     }
//   ) {}

//   /**
//    * startPublicCheckout
//    * Orchestrates the creation of a checkout session for a public ticket.
//    */
//   async startPublicCheckout(publicId: string): Promise<{ url: string }> {
//     const ticket = await this.deps.ticketService.getPublicTicket(
//       asTicketPublicId(publicId)
//     );

//     // Eligibility
//     if (ticket.status === 'paid') {
//       // NOTE: ensure 'CONFLICT' is a valid DomainError code in your project.
//       throw new DomainError('CONFLICT', 'Ticket is already paid.');
//     }

//     // Redirect back to an actually-existing public page
//     const successUrl = `${this.deps.baseUrl}/t/${ticket.publicId}?payment=success`;
//     const cancelUrl = `${this.deps.baseUrl}/t/${ticket.publicId}?payment=cancel`;

//     const session = await this.deps.paymentPort.createCheckoutSession({
//       amountCents: ticket.priceCents,
//       currency: 'usd', // TODO: inject via config if/when needed
//       successUrl,
//       cancelUrl,
//       metadata: {
//         ticketId: ticket.id,
//         publicId: ticket.publicId,
//       },
//     });

//     return { url: session.url };
//   }

//   /**
//    * handleWebhook
//    * Verifies event and updates ticket status if payment succeeded.
//    */
//   async handleWebhook(body: string | Buffer, signature: string): Promise<void> {
//     const event = await this.deps.paymentPort.verifyAndParseEvent(
//       body,
//       signature
//     );

//     // TEMP visibility (remove or swap to structured logger later)
//     console.log('[Webhook] event.type =', event.type);

//     if (event.type !== 'checkout.session.completed') {
//       // Ignore other events (ack)
//       return;
//     }

//     const ticketIdStr = event.metadata?.ticketId;
//     console.log('[Webhook] metadata.ticketId =', ticketIdStr);

//     if (!ticketIdStr) {
//       // In dev: fail loudly so you don't get false "200 OK" confidence.
//       if (process.env.NODE_ENV !== 'production') {
//         throw new PaymentError(
//           'CHECKOUT_SESSION_INVALID',
//           'Missing metadata.ticketId on checkout.session.completed'
//         );
//       }

//       console.warn('[Webhook] Missing metadata.ticketId; skipping markPaid.');
//       return;
//     }

//     try {
//       const ticketId = asTicketId(ticketIdStr);
//       await this.deps.ticketService.markPaid(ticketId);
//       console.log('[Webhook] Marked ticket PAID:', ticketId);
//     } catch (err) {
//       // Don't silently swallow; surface it so you can see why status didn't change.
//       console.error('[Webhook] markPaid failed:', err);
//       throw err;
//     }
//   }
// }

/**
 * PaymentsService
 * Owns: Payment orchestration (checkout flows, webhook handling).
 * Does NOT own: Stripe implementation details, ticket persistence logic.
 * Layer: Application
 * Trust zone: none (methods enforce their own checks)
 */

import { PaymentPort } from './paymentPort';
import { TicketService } from '../ticketService';
import { asTicketId, asTicketPublicId, DomainError } from '@/domain/shared';
import { PaymentError } from './errors';

function assertNever(x: never, message?: string): never {
  throw new DomainError('INVARIANT_VIOLATION', message ?? 'Unexpected value');
}

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
   * Creates a checkout session for a public ticket.
   * Only APPROVED tickets may be paid.
   */
  async startPublicCheckout(publicId: string): Promise<{ url: string }> {
    const ticket = await this.deps.ticketService.getPublicTicket(
      asTicketPublicId(publicId)
    );

    // ---- Eligibility gate (domain-aligned) ----
    switch (ticket.status) {
      case 'approved':
        break; // allowed
      case 'paid':
        throw new DomainError('CONFLICT', 'Ticket is already paid.');
      case 'pending':
        throw new DomainError(
          'CONFLICT',
          'Ticket must be approved before payment.'
        );
      case 'rejected':
        throw new DomainError('CONFLICT', 'Rejected tickets cannot be paid.');
      default:
        // If Ticket.status is correctly typed, this is unreachable and ticket.status is `never`.
        return assertNever(
          ticket.status,
          `Unknown ticket status: ${ticket.status}`
        );
    }

    const successUrl = `${this.deps.baseUrl}/t/${ticket.publicId}?payment=success`;
    const cancelUrl = `${this.deps.baseUrl}/t/${ticket.publicId}?payment=cancel`;

    const session = await this.deps.paymentPort.createCheckoutSession({
      amountCents: ticket.priceCents,
      currency: 'usd',
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
   * Applies payment result to domain state.
   * Webhooks must NEVER cause infinite retries for domain conflicts.
   */
  async handleWebhook(body: string | Buffer, signature: string): Promise<void> {
    const event = await this.deps.paymentPort.verifyAndParseEvent(
      body,
      signature
    );

    if (event.type !== 'checkout.session.completed') {
      return; // ACK irrelevant events
    }

    const ticketIdStr = event.metadata?.ticketId;

    if (!ticketIdStr) {
      // Dev: surface misconfiguration loudly
      if (process.env.NODE_ENV !== 'production') {
        throw new PaymentError(
          'CHECKOUT_SESSION_INVALID',
          'Missing metadata.ticketId on checkout.session.completed'
        );
      }

      // Prod: log + ACK (do not retry forever)
      console.warn('[Webhook] Missing metadata.ticketId; skipping.');
      return;
    }

    try {
      const ticketId = asTicketId(ticketIdStr);
      await this.deps.ticketService.markPaid(ticketId);
    } catch (err) {
      /**
       * Domain invariants failing here are NOT recoverable by retries.
       * Returning normally tells Stripe “event received”.
       */
      if (err instanceof DomainError) {
        console.warn(
          '[Webhook] Domain conflict while marking paid:',
          err.code,
          err.message
        );
        return;
      }

      // Infra / unknown failure → allow retry
      throw err;
    }
  }
}
