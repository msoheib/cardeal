BEGIN;

DO $$
BEGIN
  CREATE TYPE public.support_ticket_reason AS ENUM (
    'supplier_no_response',
    'car_not_received',
    'car_damaged',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.support_ticket_status AS ENUM (
    'open',
    'under_review',
    'approved',
    'rejected',
    'resolved',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.refund_scope AS ENUM (
    'none',
    'commitment_fee',
    'full_amount'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  reason public.support_ticket_reason NOT NULL,
  status public.support_ticket_status NOT NULL DEFAULT 'open',
  refund_scope public.refund_scope NOT NULL DEFAULT 'none',
  requested_refund_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (requested_refund_amount >= 0),
  description text NOT NULL CHECK (length(trim(description)) >= 10),
  evidence_urls text[] NOT NULL DEFAULT '{}',
  admin_notes text,
  reviewed_by uuid REFERENCES public.users(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_support_tickets_buyer_id ON public.support_tickets(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_dealer_id ON public.support_tickets(dealer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_deal_id ON public.support_tickets(deal_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_tickets_one_active_per_deal
  ON public.support_tickets(deal_id)
  WHERE status IN ('open'::public.support_ticket_status, 'under_review'::public.support_ticket_status);

DROP POLICY IF EXISTS "Buyers can view their support tickets" ON public.support_tickets;
CREATE POLICY "Buyers can view their support tickets"
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (buyer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Dealers can view support tickets for their deals" ON public.support_tickets;
CREATE POLICY "Dealers can view support tickets for their deals"
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (
    dealer_id IN (
      SELECT id
      FROM public.dealers
      WHERE user_id = (SELECT auth.uid())
        AND verified = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage support tickets" ON public.support_tickets;
CREATE POLICY "Admins can manage support tickets"
  ON public.support_tickets
  FOR ALL
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE OR REPLACE FUNCTION public.create_support_ticket(
  p_deal_id uuid,
  p_reason public.support_ticket_reason,
  p_description text,
  p_evidence_urls text[] DEFAULT '{}'::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deal public.deals%ROWTYPE;
  v_refund_scope public.refund_scope := 'none'::public.refund_scope;
  v_refund_amount numeric(12,2) := 0;
  v_commitment_fee_amount numeric(12,2);
  v_ticket_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'authentication_required');
  END IF;

  IF p_description IS NULL OR length(trim(p_description)) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'description_required');
  END IF;

  SELECT *
  INTO v_deal
  FROM public.deals
  WHERE id = p_deal_id;

  IF NOT FOUND OR v_deal.buyer_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'deal_not_found');
  END IF;

  IF v_deal.status <> 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'deal_must_be_approved');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.support_tickets
    WHERE deal_id = v_deal.id
      AND buyer_id = v_deal.buyer_id
      AND status IN ('open'::public.support_ticket_status, 'under_review'::public.support_ticket_status)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'ticket_already_open');
  END IF;

  IF p_reason = 'car_damaged' THEN
    v_refund_scope := 'full_amount'::public.refund_scope;
    v_refund_amount := v_deal.final_price;
  ELSIF p_reason IN ('supplier_no_response', 'car_not_received') THEN
    v_refund_scope := 'commitment_fee'::public.refund_scope;

    SELECT amount
    INTO v_commitment_fee_amount
    FROM public.commitment_fees
    WHERE bid_id = v_deal.bid_id
      AND buyer_id = v_deal.buyer_id
    ORDER BY created_at DESC
    LIMIT 1;

    v_refund_amount := COALESCE(v_commitment_fee_amount, 500);
  ELSE
    v_refund_scope := 'none'::public.refund_scope;
    v_refund_amount := 0;
  END IF;

  INSERT INTO public.support_tickets (
    deal_id,
    buyer_id,
    dealer_id,
    reason,
    refund_scope,
    requested_refund_amount,
    description,
    evidence_urls
  )
  VALUES (
    v_deal.id,
    v_deal.buyer_id,
    v_deal.dealer_id,
    p_reason,
    v_refund_scope,
    v_refund_amount,
    trim(p_description),
    COALESCE(p_evidence_urls, '{}'::text[])
  )
  RETURNING id INTO v_ticket_id;

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', v_ticket_id,
    'refund_scope', v_refund_scope,
    'requested_refund_amount', v_refund_amount
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.create_support_ticket(uuid, public.support_ticket_reason, text, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_support_ticket(uuid, public.support_ticket_reason, text, text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_support_ticket(uuid, public.support_ticket_reason, text, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_support_ticket(
  p_ticket_id uuid,
  p_status public.support_ticket_status,
  p_admin_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ticket public.support_tickets%ROWTYPE;
BEGIN
  IF NOT private.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'admin_required');
  END IF;

  IF p_status NOT IN ('under_review', 'approved', 'rejected', 'resolved', 'closed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status');
  END IF;

  SELECT *
  INTO v_ticket
  FROM public.support_tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ticket_not_found');
  END IF;

  IF p_status = 'approved' AND v_ticket.refund_scope IN ('commitment_fee', 'full_amount') THEN
    UPDATE public.commitment_fees
    SET status = 'refunded',
        processed_at = now()
    WHERE bid_id = (
        SELECT bid_id FROM public.deals WHERE id = v_ticket.deal_id
      )
      AND buyer_id = v_ticket.buyer_id
      AND status IN ('paid', 'applied_to_purchase');
  END IF;

  IF p_status = 'approved' AND v_ticket.refund_scope IN ('commitment_fee', 'full_amount') THEN
    UPDATE public.deals
    SET status = 'refunded',
        completed_at = COALESCE(completed_at, now())
    WHERE id = v_ticket.deal_id;
  END IF;

  UPDATE public.support_tickets
  SET status = p_status,
      admin_notes = NULLIF(trim(COALESCE(p_admin_notes, admin_notes, '')), ''),
      reviewed_by = (SELECT auth.uid()),
      resolved_at = CASE
        WHEN p_status IN ('approved', 'rejected', 'resolved', 'closed') THEN now()
        ELSE resolved_at
      END,
      updated_at = now()
  WHERE id = p_ticket_id
  RETURNING * INTO v_ticket;

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', v_ticket.id,
    'status', v_ticket.status,
    'refund_scope', v_ticket.refund_scope,
    'requested_refund_amount', v_ticket.requested_refund_amount
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.review_support_ticket(uuid, public.support_ticket_status, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_support_ticket(uuid, public.support_ticket_status, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.review_support_ticket(uuid, public.support_ticket_status, text) TO authenticated;

COMMENT ON TABLE public.support_tickets IS
  'Buyer-raised complaint and refund review tickets. Refund amount is derived server-side from the ticket reason.';

COMMENT ON FUNCTION public.create_support_ticket(uuid, public.support_ticket_reason, text, text[]) IS
  'Buyer-only ticket creation for completed deals. Derives requested refund amount server-side.';

COMMENT ON FUNCTION public.review_support_ticket(uuid, public.support_ticket_status, text) IS
  'Admin-only ticket review action. Marks commitment fee refunded for approved deposit refund tickets and deal refunded for approved refund tickets.';

COMMIT;
