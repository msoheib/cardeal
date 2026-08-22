import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationUrl = new URL('../../supabase/migrations/20260802120000_dealer_inventory_listing_fields.sql', import.meta.url)
const multiColorMigrationUrl = new URL('../../supabase/migrations/20260818090000_dealer_multicolor_listings.sql', import.meta.url)

test('dealer inventory migration defines isolated listing fields and lifecycle RPCs', async () => {
  const sql = await readFile(migrationUrl, 'utf8')

  assert.match(sql, /ADD COLUMN IF NOT EXISTS agency_price numeric\(12, 2\)/)
  assert.match(sql, /ADD COLUMN IF NOT EXISTS listing_description text/)
  assert.match(sql, /ADD COLUMN IF NOT EXISTS listing_images text\[\] NOT NULL DEFAULT '\{\}'/)
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.save_dealer_inventory_listing/)
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.archive_dealer_inventory_listing/)
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.restore_dealer_inventory_listing/)
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.search_available_configurations/)
  assert.match(sql, /"trim" text/)
})

test('multi-color migration preserves color-specific commercial identities behind a dealer listing', async () => {
  const sql = await readFile(multiColorMigrationUrl, 'utf8')

  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.vehicle_listing_specs/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.dealer_listings/)
  assert.match(sql, /ADD COLUMN IF NOT EXISTS dealer_listing_id/)
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.save_dealer_listing/)
  assert.match(sql, /"trim" text/)
  assert.match(sql, /p_colors jsonb/)
  assert.match(sql, /duplicate_color_row/)
  assert.match(sql, /color_quantity_must_be_positive_integer/)
  assert.match(sql, /color_has_unresolved_commercial_workflow/)
})

test('multi-color lifecycle RPCs retain ownership and paid-workflow protections', async () => {
  const sql = await readFile(multiColorMigrationUrl, 'utf8')
  const archiveRpc = sql.split('CREATE OR REPLACE FUNCTION public.archive_dealer_listing')[1].split('CREATE OR REPLACE FUNCTION public.restore_dealer_listing')[0]

  assert.match(archiveRpc, /d\.user_id = \(SELECT auth\.uid\(\)\)/)
  assert.match(archiveRpc, /b\.commitment_fee_paid = true/)
  assert.match(archiveRpc, /d\.status = 'pending_payment'/)
  assert.match(archiveRpc, /UPDATE public\.dealer_listings SET status = 'hidden'/)
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.archive_dealer_listing\(uuid\) TO authenticated/)
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.restore_dealer_listing\(uuid\) TO authenticated/)
})

test('public multi-color search exposes aggregate stock without dealer identifiers', async () => {
  const sql = await readFile(multiColorMigrationUrl, 'utf8')
  const searchRpc = sql.split('CREATE OR REPLACE FUNCTION public.search_available_vehicle_listings')[1].split('-- Compatibility wrappers')[0]

  assert.match(searchRpc, /SUM\(di\.quantity\)::bigint AS available_quantity/)
  assert.match(searchRpc, /jsonb_build_object\(/)
  assert.match(searchRpc, /'configuration_id'/)
  assert.match(searchRpc, /dl\.status = 'active'/)
  assert.doesNotMatch(searchRpc.split('RETURNS TABLE')[1].split('LANGUAGE sql')[0], /dealer_id/)
})

test('save RPC enforces dealer ownership, row locking, duplicate protection, and avoids price_slots', async () => {
  const sql = await readFile(migrationUrl, 'utf8')
  const saveRpc = sql.split('CREATE OR REPLACE FUNCTION public.save_dealer_inventory_listing')[1].split('REVOKE ALL ON FUNCTION public.save_dealer_inventory_listing')[0]

  assert.match(saveRpc, /d\.verified = true/)
  assert.match(saveRpc, /FOR UPDATE/)
  assert.match(saveRpc, /duplicate_inventory_listing/)
  assert.match(saveRpc, /agency_price/)
  assert.doesNotMatch(saveRpc, /price_slots/)
})

test('archive RPC protects unresolved commercial workflows and buyer search excludes hidden stock', async () => {
  const sql = await readFile(migrationUrl, 'utf8')
  const archiveRpc = sql.split('CREATE OR REPLACE FUNCTION public.archive_dealer_inventory_listing')[1].split('REVOKE ALL ON FUNCTION public.archive_dealer_inventory_listing')[0]
  const searchRpc = sql.split('CREATE OR REPLACE FUNCTION public.search_available_configurations')[1]

  assert.match(archiveRpc, /d\.status = 'pending_payment'/)
  assert.match(archiveRpc, /b\.commitment_fee_paid = true/)
  assert.match(archiveRpc, /status = 'hidden'/)
  assert.match(searchRpc, /di\.status = 'active'/)
  assert.match(searchRpc, /di\.quantity > 0/)
  assert.match(searchRpc, /MIN\(di\.agency_price\)/)
})
