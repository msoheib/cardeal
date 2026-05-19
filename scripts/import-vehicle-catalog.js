#!/usr/bin/env node

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const zlib = require('node:zlib')
const { createClient } = require('@supabase/supabase-js')

const ARABIC_RE = /[\u0600-\u06ff]/
const DEFAULT_WORKBOOK = path.join(os.homedir(), 'Downloads', 'ماركات واسماء السيارات.xlsx')

function parseArgs(argv) {
  const args = {
    workbook: process.env.VEHICLE_CATALOG_WORKBOOK || DEFAULT_WORKBOOK,
    dryRun: false,
    writeDisplayMap: null,
    jsonOut: null
  }

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--workbook') args.workbook = argv[++i]
    else if (arg === '--dry-run') args.dryRun = true
    else if (arg === '--write-display-map') args.writeDisplayMap = argv[++i]
    else if (arg === '--json-out') args.jsonOut = argv[++i]
    else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const text = fs.readFileSync(filePath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match) continue
    const [, key, rawValue] = match
    if (process.env[key]) continue
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '')
  }
}

function decodeXml(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function findZipEntries(buffer) {
  let eocd = -1
  for (let i = buffer.length - 22; i >= 0; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('Invalid xlsx: missing ZIP directory')

  const totalEntries = buffer.readUInt16LE(eocd + 10)
  const centralDirectoryOffset = buffer.readUInt32LE(eocd + 16)
  const entries = new Map()
  let cursor = centralDirectoryOffset

  for (let i = 0; i < totalEntries; i += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error('Invalid xlsx: malformed ZIP directory')
    }

    const compressionMethod = buffer.readUInt16LE(cursor + 10)
    const compressedSize = buffer.readUInt32LE(cursor + 20)
    const nameLength = buffer.readUInt16LE(cursor + 28)
    const extraLength = buffer.readUInt16LE(cursor + 30)
    const commentLength = buffer.readUInt16LE(cursor + 32)
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42)
    const name = buffer.toString('utf8', cursor + 46, cursor + 46 + nameLength)

    entries.set(name, { compressionMethod, compressedSize, localHeaderOffset })
    cursor += 46 + nameLength + extraLength + commentLength
  }

  return entries
}

function readZipEntry(buffer, entries, name) {
  const entry = entries.get(name)
  if (!entry) return ''
  const local = entry.localHeaderOffset
  if (buffer.readUInt32LE(local) !== 0x04034b50) {
    throw new Error(`Invalid xlsx: bad local header for ${name}`)
  }

  const nameLength = buffer.readUInt16LE(local + 26)
  const extraLength = buffer.readUInt16LE(local + 28)
  const dataStart = local + 30 + nameLength + extraLength
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize)

  if (entry.compressionMethod === 0) return compressed.toString('utf8')
  if (entry.compressionMethod === 8) return zlib.inflateRawSync(compressed).toString('utf8')
  throw new Error(`Unsupported xlsx compression method ${entry.compressionMethod} for ${name}`)
}

function parseSharedStrings(xml) {
  if (!xml) return []
  const strings = []
  const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g
  let match
  while ((match = siRegex.exec(xml))) {
    const textParts = []
    const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g
    let textMatch
    while ((textMatch = tRegex.exec(match[1]))) {
      textParts.push(decodeXml(textMatch[1]))
    }
    strings.push(textParts.join(''))
  }
  return strings
}

function columnIndex(cellRef) {
  const letters = cellRef.replace(/\d+/g, '')
  let index = 0
  for (const char of letters) index = index * 26 + char.charCodeAt(0) - 64
  return index - 1
}

function parseSheet(xml, sharedStrings) {
  const rows = []
  const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/g
  let rowMatch
  while ((rowMatch = rowRegex.exec(xml))) {
    const row = []
    const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/g
    let cellMatch
    while ((cellMatch = cellRegex.exec(rowMatch[1]))) {
      const attrs = cellMatch[1]
      const body = cellMatch[2]
      const ref = attrs.match(/\br="([^"]+)"/)?.[1]
      const type = attrs.match(/\bt="([^"]+)"/)?.[1]
      const valueMatch = body.match(/<v>([\s\S]*?)<\/v>/)
      const inlineMatch = body.match(/<t\b[^>]*>([\s\S]*?)<\/t>/)
      let value = ''

      if (type === 's' && valueMatch) value = sharedStrings[Number(valueMatch[1])] || ''
      else if (inlineMatch) value = decodeXml(inlineMatch[1])
      else if (valueMatch) value = decodeXml(valueMatch[1])

      const index = ref ? columnIndex(ref) : row.length
      row[index] = cleanText(value)
    }
    rows.push(row)
  }
  return rows
}

function parseWorkbook(workbookPath) {
  const buffer = fs.readFileSync(workbookPath)
  const entries = findZipEntries(buffer)
  const sharedStrings = parseSharedStrings(readZipEntry(buffer, entries, 'xl/sharedStrings.xml'))
  const workbookXml = readZipEntry(buffer, entries, 'xl/workbook.xml')
  const relsXml = readZipEntry(buffer, entries, 'xl/_rels/workbook.xml.rels')
  const rels = new Map()

  for (const match of relsXml.matchAll(/<Relationship\b([^>]+?)\/>/g)) {
    const attrs = match[1]
    const id = attrs.match(/\bId="([^"]+)"/)?.[1]
    const target = attrs.match(/\bTarget="([^"]+)"/)?.[1]
    if (id && target) rels.set(id, target.replace(/^\/?xl\//, ''))
  }

  const sheets = new Map()
  for (const match of workbookXml.matchAll(/<sheet\b([^>]+?)\/>/g)) {
    const attrs = match[1]
    const name = decodeXml(attrs.match(/\bname="([^"]+)"/)?.[1] || '')
    const relId = attrs.match(/\br:id="([^"]+)"/)?.[1]
    const target = rels.get(relId)
    if (!name || !target) continue
    const sheetXml = readZipEntry(buffer, entries, `xl/${target}`)
    sheets.set(name, parseSheet(sheetXml, sharedStrings))
  }

  return sheets
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripTrailingNotes(value) {
  return cleanText(value)
    .replace(/[：:]\s*$/, '')
    .replace(/\s+-\s+.*$/, '')
}

function splitName(value) {
  const text = stripTrailingNotes(value)
  const pair = text.match(/^(.*?)\s*\((.*?)\)\s*$/)
  if (!pair) {
    return ARABIC_RE.test(text) ? { name_ar: text, name_en: null } : { name_ar: text, name_en: text }
  }

  const left = cleanText(pair[1])
  const inside = cleanText(pair[2])
  const leftArabic = ARABIC_RE.test(left)
  const insideArabic = ARABIC_RE.test(inside)

  if (leftArabic && !insideArabic) return { name_ar: left, name_en: inside }
  if (!leftArabic && insideArabic) return { name_ar: inside, name_en: left }
  return { name_ar: left, name_en: inside || left }
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function preferredSlug(entry) {
  return slugify(entry.name_en || entry.name_ar)
}

function mergeText(existing, incoming) {
  if (!incoming) return existing || null
  if (!existing) return incoming
  if (existing === incoming) return existing
  return existing.includes(incoming) ? existing : `${existing}; ${incoming}`
}

function addSource(entry, sourceSheet) {
  entry.source_sheets.add(sourceSheet)
}

function buildCatalog(sheets) {
  const makes = new Map()
  const models = new Map()

  function upsertMake({ name_ar, name_en, origin_country, classification, notes, sourceSheet }) {
    const fallback = name_en || name_ar
    if (!fallback) return null
    const slug = slugify(fallback)
    if (!slug || ['ماركة-السيارة', 'التصنيف'].includes(slug)) return null

    const incoming = {
      slug,
      name_ar: name_ar || name_en,
      name_en: name_en || (ARABIC_RE.test(name_ar || '') ? null : name_ar),
      origin_country: origin_country || null,
      classification: classification || null,
      notes: notes || null,
      source_sheets: new Set()
    }

    const existing = makes.get(slug)
    if (!existing) {
      addSource(incoming, sourceSheet)
      makes.set(slug, incoming)
      return incoming
    }

    if (ARABIC_RE.test(incoming.name_ar || '') && !ARABIC_RE.test(existing.name_ar || '')) {
      existing.name_ar = incoming.name_ar
    }
    existing.name_en = existing.name_en || incoming.name_en
    existing.origin_country = existing.origin_country || incoming.origin_country
    existing.classification = existing.classification || incoming.classification
    existing.notes = mergeText(existing.notes, incoming.notes)
    addSource(existing, sourceSheet)
    return existing
  }

  function upsertModel(make, modelName, sourceSheet) {
    if (!make || !modelName) return
    const parsed = splitName(modelName)
    const nameEn = parsed.name_en || parsed.name_ar
    const slug = slugify(nameEn)
    if (!slug || slug === preferredSlug(make)) return

    const key = `${make.slug}:${slug}`
    const existing = models.get(key)
    if (existing) {
      if (parsed.name_ar && ARABIC_RE.test(parsed.name_ar) && !ARABIC_RE.test(existing.name_ar || '')) {
        existing.name_ar = parsed.name_ar
      }
      existing.name_en = existing.name_en || nameEn
      addSource(existing, sourceSheet)
      return
    }

    models.set(key, {
      make_slug: make.slug,
      slug,
      name_ar: parsed.name_ar && ARABIC_RE.test(parsed.name_ar) ? parsed.name_ar : null,
      name_en: nameEn,
      source_sheets: new Set([sourceSheet])
    })
  }

  for (const [sheetName, rows] of sheets.entries()) {
    if (sheetName.includes('المركات و فئتها')) {
      for (const row of rows.slice(1)) {
        upsertMake({
          classification: cleanText(row[0]),
          name_ar: cleanText(row[1]),
          name_en: cleanText(row[2]),
          origin_country: cleanText(row[3]),
          notes: cleanText(row[4]),
          sourceSheet: sheetName
        })
      }
    } else if (sheetName.includes('المركات و المدن')) {
      for (const row of rows.slice(1)) {
        const parsed = splitName(row[1])
        upsertMake({
          name_ar: parsed.name_ar,
          name_en: parsed.name_en,
          origin_country: cleanText(row[2]),
          sourceSheet: sheetName
        })
      }
    } else if (sheetName.includes('الصينية') && sheetName.includes('فئتها')) {
      for (const row of rows) {
        const parsed = splitName(row[2])
        upsertMake({
          name_ar: parsed.name_ar,
          name_en: parsed.name_en,
          origin_country: 'الصين',
          notes: [cleanText(row[3]), cleanText(row[4])].filter(Boolean).join('; '),
          sourceSheet: sheetName
        })
      }
    }
  }

  for (const [sheetName, rows] of sheets.entries()) {
    if (sheetName.includes('الماركة والنوع') || sheetName.includes('المركبات الصينية')) {
      let currentMake = null
      for (const row of rows) {
        const value = cleanText(row.find(Boolean))
        if (!value) continue
        if (value.includes('ماركات')) {
          currentMake = null
          continue
        }

        const isHeading = /[:：]\s*$/.test(value)
        if (isHeading) {
          if (/^موديلات\s*[:：]/.test(value)) {
            const listedModels = value
              .replace(/^موديلات\s*[:：]\s*/, '')
              .split(/[,،]/)
              .map(cleanText)
              .filter(Boolean)
            listedModels.forEach(modelName => upsertModel(currentMake, modelName, sheetName))
            continue
          }

          const parsed = splitName(value)
          currentMake = upsertMake({
            name_ar: parsed.name_ar,
            name_en: parsed.name_en,
            origin_country: sheetName.includes('الصينية') ? 'الصين' : null,
            sourceSheet: sheetName
          })
        } else {
          const modelValue = stripTrailingNotes(value)
          if (/^(لم|سيارات|بعض)\b/.test(modelValue)) continue
          if (sheetName.includes('الماركة والنوع') && !/\([^)]+\)/.test(value)) continue
          if (modelValue.length > 50) continue
          upsertModel(currentMake, modelValue, sheetName)
        }
      }
    }
  }

  const makeRows = [...makes.values()]
    .map(make => ({
      ...make,
      source_sheets: [...make.source_sheets].sort()
    }))
    .sort((a, b) => (a.name_en || a.name_ar).localeCompare(b.name_en || b.name_ar, 'en'))

  const modelRows = [...models.values()]
    .map(model => ({
      ...model,
      source_sheets: [...model.source_sheets].sort()
    }))
    .sort((a, b) => a.make_slug.localeCompare(b.make_slug, 'en') || a.name_en.localeCompare(b.name_en, 'en'))

  return { makes: makeRows, models: modelRows }
}

function writeDisplayMap(catalog, outputPath) {
  const aliases = new Map()
  for (const make of catalog.makes) {
    if (make.name_en && make.name_ar && ARABIC_RE.test(make.name_ar) && make.name_en !== make.name_ar) {
      aliases.set(make.name_en, make.name_ar)
    }
  }
  for (const model of catalog.models) {
    if (model.name_en && model.name_ar && ARABIC_RE.test(model.name_ar) && model.name_en !== model.name_ar) {
      aliases.set(model.name_en, model.name_ar)
    }
  }

  const body = [...aliases.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'en'))
    .map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`)
    .join(',\n')

  const content = `// Generated by scripts/import-vehicle-catalog.js from the vehicle catalog workbook.\nexport const VEHICLE_CATALOG_TEXT: Record<string, string> = {\n${body}\n}\n`
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, content, 'utf8')
}

async function seedSupabase(catalog) {
  loadEnvFile(path.join(process.cwd(), '.env.local'))
  loadEnvFile(path.join(process.cwd(), '.env'))

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const now = new Date().toISOString()
  const { data: makeData, error: makeError } = await supabase
    .from('vehicle_makes')
    .upsert(
      catalog.makes.map(make => ({
        slug: make.slug,
        name_ar: make.name_ar,
        name_en: make.name_en,
        origin_country: make.origin_country,
        classification: make.classification,
        notes: make.notes,
        source_sheets: make.source_sheets,
        active: true,
        updated_at: now
      })),
      { onConflict: 'slug' }
    )
    .select('id, slug')

  if (makeError) throw makeError

  const makeIds = new Map(makeData.map(make => [make.slug, make.id]))
  const modelPayload = catalog.models
    .map(model => ({
      make_id: makeIds.get(model.make_slug),
      slug: model.slug,
      name_ar: model.name_ar,
      name_en: model.name_en,
      source_sheets: model.source_sheets,
      active: true,
      updated_at: now
    }))
    .filter(model => model.make_id)

  for (let i = 0; i < modelPayload.length; i += 500) {
    const chunk = modelPayload.slice(i, i + 500)
    const { error } = await supabase
      .from('vehicle_models')
      .upsert(chunk, { onConflict: 'make_id,slug' })
    if (error) throw error
  }

  return { makes: makeData.length, models: modelPayload.length }
}

async function main() {
  const args = parseArgs(process.argv)
  const sheets = parseWorkbook(args.workbook)
  const catalog = buildCatalog(sheets)

  if (args.jsonOut) {
    fs.writeFileSync(args.jsonOut, JSON.stringify(catalog, null, 2), 'utf8')
  }

  if (args.writeDisplayMap) {
    writeDisplayMap(catalog, args.writeDisplayMap)
  }

  console.log(`Parsed ${catalog.makes.length} makes and ${catalog.models.length} models from ${path.basename(args.workbook)}`)
  console.log(`Sample makes: ${catalog.makes.slice(0, 5).map(make => `${make.name_ar}/${make.name_en || '-'}`).join(', ')}`)

  if (!args.dryRun) {
    const result = await seedSupabase(catalog)
    console.log(`Upserted ${result.makes} makes and ${result.models} models into Supabase`)
  }
}

main().catch(error => {
  console.error(error.message || error)
  process.exit(1)
})
