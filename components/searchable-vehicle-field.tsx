'use client'

import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface SearchableVehicleOption {
  value: string
  searchText: string
  label: React.ReactNode
}

interface SearchableVehicleFieldProps {
  value: string
  placeholder: string
  searchPlaceholder: string
  options: SearchableVehicleOption[]
  onChange: (value: string) => void
  disabled?: boolean
  emptyText?: string
}

export function SearchableVehicleField({
  value,
  placeholder,
  searchPlaceholder,
  options,
  onChange,
  disabled,
  emptyText = 'لا توجد نتائج',
}: SearchableVehicleFieldProps) {
  const selected = options.find((option) => option.value === value)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn(!selected && 'text-muted-foreground')}>
            {selected?.label || placeholder}
          </span>
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(420px,calc(100vw-2rem))] p-0" align="start">
        <Command dir="rtl">
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.searchText}
                onSelect={() => onChange(option.value)}
                className="gap-2"
              >
                <Check className={cn('h-4 w-4', value === option.value ? 'opacity-100' : 'opacity-0')} />
                <span className="min-w-0 flex-1">{option.label}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
