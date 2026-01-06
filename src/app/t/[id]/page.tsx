import { notFound } from 'next/navigation';
import { makeTicketService } from '@/server/services';
import { asTicketPublicId, DomainError } from '@/domain/shared';

export default async function PublicTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let publicId;
  try {
    publicId = asTicketPublicId(id);
  } catch {
    notFound();
  }

  let ticket;
  try {
    ticket = await makeTicketService().getPublicTicket(publicId);
  } catch (e) {
    if (e instanceof DomainError && e.code === 'NOT_FOUND') notFound();
    throw e;
  }

  return (
    <main className="mx-auto max-w-xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Change Request</h1>
        <p className="text-sm opacity-70">Public link</p>
      </header>

      <section className="space-y-2">
        <div className="text-sm opacity-70">Request</div>
        <div className="whitespace-pre-wrap">{ticket.message}</div>
      </section>

      <section className="space-y-2">
        <div className="text-sm opacity-70">Price</div>
        <div>{ticket.priceCents}</div>
      </section>

      <section className="space-y-2">
        <div className="text-sm opacity-70">Status</div>
        <div>{ticket.status}</div>
      </section>
    </main>
  );
}
