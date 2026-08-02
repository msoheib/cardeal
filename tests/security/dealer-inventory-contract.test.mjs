import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationUrl = new URL('../../supabase/migrations/20260802120000_dealer_inventory_listing_fields.sql', import.meta.url)

test('dealer inventory migration defines isolated listing fields and lifecycle RPCs', async () => {
  const sql = await readFile(migrationUrl, 'utf8')

  assert.match(sql, /ADD COLUMN IF NOT EXISTS agency_price numeric\(12, 2\)/)
  assert.match(sql, /ADD COLUMN IF NOT EXISTS listing_description text/)
  assert.match(sql, /ADD COLUMN IF NOT EXISTS listing_images text\[\] NOT NULL DEFAULT '\{\}'/)
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.save_dealer_inventory_listing/)
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.archive_dealer_inventory_listing/)
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.restore_dealer_inventory_listing/)
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.search_available_configurations/)
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
