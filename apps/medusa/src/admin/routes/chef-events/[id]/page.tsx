import { defineRouteConfig } from '@medusajs/admin-sdk';
import { Container, Heading, toast, Button, FocusModal, Textarea, Label, Checkbox, Input, Select } from '@medusajs/ui';
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { ChefEventForm } from '../components/chef-event-form';
import { MenuDetails } from '../components/menu-details';
import { PickupDetails } from '../components/pickup-details';
import { EmailManagementSection } from '../components/EmailManagementSection';
import {
  useAdminRetrieveChefEvent,
  useAdminUpdateChefEventMutation,
  useAdminAcceptChefEventMutation,
  useAdminRejectChefEventMutation,
  useAdminSendReceiptMutation,
} from '../../../hooks/chef-events';

const ChefEventDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: chefEvent, isLoading } = useAdminRetrieveChefEvent(id!);
  const updateChefEvent = useAdminUpdateChefEventMutation(id!);
  const acceptChefEvent = useAdminAcceptChefEventMutation();
  const rejectChefEvent = useAdminRejectChefEventMutation();

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [chefNotes, setChefNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [sendAcceptanceEmail, setSendAcceptanceEmail] = useState(true);
  const [tipAmount, setTipAmount] = useState<string>('');
  const [tipMethod, setTipMethod] = useState<string>('');
  const [tipMethodOther, setTipMethodOther] = useState('');

  const sendReceiptMutation = useAdminSendReceiptMutation();

  const handleUpdateChefEvent = async (data: any) => {
    try {
      await updateChefEvent.mutateAsync(data);
      toast.success('Chef Event Updated', {
        description: 'The chef event has been updated successfully.',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error updating chef event:', error);
      toast.error('Update Failed', {
        description: 'There was an error updating the chef event. Please try again.',
        duration: 5000,
      });
    }
  };

  const handleAcceptEvent = async () => {
    try {
      await acceptChefEvent.mutateAsync({
        id: id!,
        data: {
          chefNotes: chefNotes || undefined,
          sendAcceptanceEmail: sendAcceptanceEmail,
        },
      });
      toast.success('Event Accepted', {
        description: 'The event has been accepted and a product has been created for ticket sales.',
        duration: 5000,
      });
      setShowAcceptModal(false);
      setChefNotes('');
      setSendAcceptanceEmail(true);
    } catch (error) {
      console.error('Error accepting chef event:', error);
      toast.error('Acceptance Failed', {
        description: 'There was an error accepting the chef event. Please try again.',
        duration: 5000,
      });
    }
  };

  const handleRejectEvent = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Rejection Reason Required', {
        description: 'Please provide a reason for rejecting this event.',
        duration: 3000,
      });
      return;
    }

    try {
      await rejectChefEvent.mutateAsync({
        id: id!,
        data: {
          rejectionReason: rejectionReason.trim(),
          chefNotes: chefNotes || undefined,
        },
      });
      toast.success('Event Rejected', {
        description: 'The event has been rejected and the customer has been notified.',
        duration: 5000,
      });
      setShowRejectModal(false);
      setRejectionReason('');
      setChefNotes('');
    } catch (error) {
      console.error('Error rejecting chef event:', error);
      toast.error('Rejection Failed', {
        description: 'There was an error rejecting the chef event. Please try again.',
        duration: 5000,
      });
    }
  };

  if (isLoading) {
    return (
      <Container className="p-6">
        <div>Loading...</div>
      </Container>
    );
  }

  if (!chefEvent) {
    return (
      <Container className="p-6">
        <div>Chef event not found</div>
      </Container>
    );
  }

  const isPending = chefEvent.status === 'pending';
  const isConfirmed = chefEvent.status === 'confirmed';

  const requestedDate = chefEvent.requestedDate
    ? (typeof chefEvent.requestedDate === 'string'
        ? new Date(chefEvent.requestedDate)
        : chefEvent.requestedDate)
    : null;
  const today = new Date();
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const eventDateOnly =
    requestedDate &&
    new Date(
      requestedDate.getFullYear(),
      requestedDate.getMonth(),
      requestedDate.getDate()
    );
  const hasEventTakenPlace =
    !!eventDateOnly && eventDateOnly.getTime() <= todayDateOnly.getTime();
  const availableTickets = (chefEvent as { availableTickets?: number }).availableTickets ?? undefined;
  const canShowReceiptButton =
    isConfirmed &&
    !!chefEvent.productId &&
    (hasEventTakenPlace || (typeof availableTickets === 'number' && availableTickets === 0));
  const emailHistory = (chefEvent as { emailHistory?: Array<{ type: string }> }).emailHistory ?? [];
  const hasReceiptAlreadySent = emailHistory.some((e) => e.type === 'receipt');

  const handleSendReceipt = async () => {
    const amount = tipAmount.trim() === '' ? undefined : parseFloat(tipAmount);
    if (amount !== undefined && (Number.isNaN(amount) || amount < 0)) {
      toast.error('Invalid tip', {
        description: 'Tip amount must be a non-negative number.',
        duration: 3000,
      });
      return;
    }
    const method =
      tipMethod === 'Other' ? (tipMethodOther.trim() || 'Other') : tipMethod;
    if (amount != null && amount > 0 && !method) {
      toast.error('Tip method required', {
        description: 'Please select or enter a tip method when a tip amount is provided.',
        duration: 3000,
      });
      return;
    }
    try {
      await sendReceiptMutation.mutateAsync({
        chefEventId: id!,
        tipAmount: amount,
        tipMethod: method || undefined,
      });
      toast.success('Receipt sent', {
        description: 'The receipt email has been sent to the host.',
        duration: 3000,
      });
      setShowReceiptModal(false);
      setTipAmount('');
      setTipMethod('');
      setTipMethodOther('');
    } catch (error) {
      console.error('Error sending receipt:', error);
      toast.error('Send receipt failed', {
        description: 'There was an error sending the receipt. Please try again.',
        duration: 5000,
      });
    }
  };

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">
          Edit Chef Event - {(chefEvent as any).firstName} {(chefEvent as any).lastName}
        </Heading>

        {isPending && (
          <div className="flex space-x-2">
            <Button variant="primary" size="small" onClick={() => setShowAcceptModal(true)}>
              Accept Event
            </Button>
            <Button variant="danger" size="small" onClick={() => setShowRejectModal(true)}>
              Reject Event
            </Button>
          </div>
        )}

        {isConfirmed && chefEvent.productId && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="small" asChild>
              <a href={`/products/${chefEvent.productId}`} target="_blank" rel="noreferrer">
                View Product
              </a>
            </Button>
            {canShowReceiptButton && (
              <Button
                variant="secondary"
                size="small"
                onClick={() => setShowReceiptModal(true)}
              >
                Send Receipt
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Show pickup-specific form for pickup events */}
        {chefEvent && (chefEvent as any).eventType === 'pickup' ? (
          <PickupDetails
            chefEvent={chefEvent}
            onSubmit={handleUpdateChefEvent}
            isLoading={updateChefEvent.isPending}
            onCancel={() => window.history.back()}
          />
        ) : chefEvent ? (
          <>
            <ChefEventForm
              initialData={chefEvent}
              onSubmit={handleUpdateChefEvent}
              isLoading={updateChefEvent.isPending}
              onCancel={() => window.history.back()}
            />

            {/* Show menu details for event-based orders */}
            <MenuDetails templateProductId={(chefEvent as any).templateProductId} />
          </>
        ) : null}

        {/* Email Management Section for confirmed events */}
        {isConfirmed && (
          <EmailManagementSection
            chefEvent={chefEvent}
            onEmailSent={(emailData) => {
              // Refresh event data to show updated email history
              // refetch() - will be available once we update the hooks
              toast.success('Email Sent', {
                description: `Event details sent successfully`,
                duration: 3000,
              });
            }}
          />
        )}
      </div>

      {/* Accept Event Modal */}
      {showAcceptModal && (
        <FocusModal open onOpenChange={setShowAcceptModal}>
          <FocusModal.Content>
            <FocusModal.Header>
              <FocusModal.Title>Accept Event</FocusModal.Title>
            </FocusModal.Header>
            <FocusModal.Body>
              <div className="space-y-4">
                <p>This will accept the event and create a product for ticket sales.</p>

                {/* Email Notification Control */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="send-acceptance-email"
                    checked={sendAcceptanceEmail}
                    onCheckedChange={(checked) => setSendAcceptanceEmail(checked === true)}
                  />
                  <Label htmlFor="send-acceptance-email">Send acceptance email to customer</Label>
                </div>

                <div>
                  <Label htmlFor="chef-notes">Chef Notes (Optional)</Label>
                  <Textarea
                    id="chef-notes"
                    placeholder="Add any notes about this acceptance..."
                    value={chefNotes}
                    onChange={(e) => setChefNotes(e.target.value)}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="secondary" onClick={() => setShowAcceptModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleAcceptEvent} disabled={acceptChefEvent.isPending}>
                    {acceptChefEvent.isPending ? 'Accepting...' : 'Accept Event'}
                  </Button>
                </div>
              </div>
            </FocusModal.Body>
          </FocusModal.Content>
        </FocusModal>
      )}

      {/* Send Receipt Modal */}
      {showReceiptModal && (
        <FocusModal open onOpenChange={setShowReceiptModal}>
          <FocusModal.Content>
            <FocusModal.Header>
              <FocusModal.Title>Send Receipt</FocusModal.Title>
            </FocusModal.Header>
            <FocusModal.Body>
              <div className="space-y-4">
                {hasReceiptAlreadySent && (
                  <p className="text-amber-600 text-sm">
                    A receipt has already been sent for this event. Sending again will add another receipt to the history.
                  </p>
                )}
                <p className="text-gray-600 text-sm">
                  Send a receipt email to the host. You can optionally include a tip amount (e.g. for cash tips) for expense documentation.
                </p>
                <div>
                  <Label htmlFor="tip-amount">Tip amount (optional)</Label>
                  <Input
                    id="tip-amount"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="tip-method">Tip method (required if tip amount is set)</Label>
                  <Select
                    value={tipMethod}
                    onValueChange={setTipMethod}
                  >
                    <Select.Trigger id="tip-method">
                      <Select.Value placeholder="Select method" />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="Cash">Cash</Select.Item>
                      <Select.Item value="Venmo">Venmo</Select.Item>
                      <Select.Item value="Zelle">Zelle</Select.Item>
                      <Select.Item value="PayPal">PayPal</Select.Item>
                      <Select.Item value="Other">Other</Select.Item>
                    </Select.Content>
                  </Select>
                </div>
                {tipMethod === 'Other' && (
                  <div>
                    <Label htmlFor="tip-method-other">Specify method</Label>
                    <Input
                      id="tip-method-other"
                      placeholder="e.g. Check, Gift card"
                      value={tipMethodOther}
                      onChange={(e) => setTipMethodOther(e.target.value)}
                    />
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setShowReceiptModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSendReceipt}
                    disabled={sendReceiptMutation.isPending}
                  >
                    {sendReceiptMutation.isPending ? 'Sending...' : 'Send Receipt'}
                  </Button>
                </div>
              </div>
            </FocusModal.Body>
          </FocusModal.Content>
        </FocusModal>
      )}

      {/* Reject Event Modal */}
      {showRejectModal && (
        <FocusModal open onOpenChange={setShowRejectModal}>
          <FocusModal.Content>
            <FocusModal.Header>
              <FocusModal.Title>Reject Event</FocusModal.Title>
            </FocusModal.Header>
            <FocusModal.Body>
              <div className="space-y-4">
                <p>This will reject the event and send a rejection email to the customer.</p>
                <div>
                  <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Please provide a reason for rejecting this event..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="rejection-notes">Chef Notes (Optional)</Label>
                  <Textarea
                    id="rejection-notes"
                    placeholder="Add any additional notes..."
                    value={chefNotes}
                    onChange={(e) => setChefNotes(e.target.value)}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="danger" onClick={handleRejectEvent} disabled={rejectChefEvent.isPending}>
                    {rejectChefEvent.isPending ? 'Rejecting...' : 'Reject Event'}
                  </Button>
                </div>
              </div>
            </FocusModal.Body>
          </FocusModal.Content>
        </FocusModal>
      )}
    </Container>
  );
};

export const config = defineRouteConfig({
  label: 'Chef Event Details',
});

export default ChefEventDetailPage;
