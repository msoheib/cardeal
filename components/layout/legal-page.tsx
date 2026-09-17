import * as React from 'react'
import { AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'

export interface LegalSection {
  heading: string
  /** Paragraphs and/or bullet lists, in order. */
  body: (string | string[])[]
}

interface LegalPageProps {
  title: string
  description: string
  updatedAt: string
  sections: LegalSection[]
  /** Shown until the text has been reviewed by a lawyer. */
  draftNotice?: boolean
}

export function LegalPage({ title, description, updatedAt, sections, draftNotice = true }: LegalPageProps) {
  return (
    <div className="page-narrow space-y-6">
      <PageHeader eyebrow={`آخر تحديث: ${updatedAt}`} title={title} description={description} />

      {draftNotice && (
        <p className="flex gap-2 rounded-md bg-status-warning p-3 text-sm leading-6 text-status-warning-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          مسودة للمراجعة القانونية: هذه الصياغة تصف آلية عمل المنصة الحالية، ويجب اعتمادها من مستشار قانوني قبل الإطلاق، مع تعبئة البيانات النظامية بين الأقواس المربعة.
        </p>
      )}

      <div className="space-y-6">
        {sections.map((section, index) => (
          <section key={section.heading} className="space-y-2">
            <h2 className="section-title">
              <span className="num me-1 text-muted-foreground">{index + 1}.</span>
              {section.heading}
            </h2>
            {section.body.map((block, blockIndex) =>
              Array.isArray(block) ? (
                <ul key={blockIndex} className="list-disc space-y-1.5 ps-5 text-sm leading-7 marker:text-muted-foreground">
                  {block.map((item) => <li key={item}>{item}</li>)}
                </ul>
              ) : (
                <p key={blockIndex} className="text-sm leading-7">{block}</p>
              )
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
