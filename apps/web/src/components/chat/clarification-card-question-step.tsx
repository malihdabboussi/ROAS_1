'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

interface ClarificationOption {
  id: string
  label: string
  description?: string
}

export interface ClarificationQuestion {
  id: string
  text: string
  type: 'single_choice' | 'multiple_choice'
  options: ClarificationOption[]
  required: boolean
}

function ChoiceOptionRow({
  option,
  index,
  isSelected,
  onSelect,
  disabled,
  isLast,
}: {
  option: ClarificationOption
  index: number
  isSelected: boolean
  onSelect: () => void
  disabled?: boolean
  isLast?: boolean
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`px-spacing-3 py-spacing-3 w-full text-left transition-all duration-200 ${!isLast ? 'border-border border-b' : ''} ${isSelected ? 'bg-primary/10' : 'hover:bg-hover-subtle bg-transparent'} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <div className="gap-spacing-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="body-2 text-foreground font-medium">{option.label}</div>
          {option.description && (
            <div className="body-3 text-muted-foreground mt-0.5">{option.description}</div>
          )}
        </div>
        <div
          className={`body-3 rounded-spacing-1 flex h-6 w-6 flex-shrink-0 items-center justify-center font-medium ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >
          {index + 1}
        </div>
      </div>
    </button>
  )
}

function MultiChoiceOptionRow({
  option,
  isSelected,
  onToggle,
  disabled,
  isLast,
}: {
  option: ClarificationOption
  isSelected: boolean
  onToggle: () => void
  disabled?: boolean
  isLast?: boolean
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`px-spacing-3 py-spacing-3 w-full text-left transition-all duration-200 ${!isLast ? 'border-border border-b' : ''} ${isSelected ? 'bg-primary/10' : 'hover:bg-hover-subtle bg-transparent'} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <div className="gap-spacing-3 flex items-start">
        <div
          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'}`}
        >
          {isSelected && <Check className="text-primary-foreground h-3 w-3" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="body-2 text-foreground font-medium">{option.label}</div>
          {option.description && (
            <div className="body-3 text-muted-foreground mt-0.5">{option.description}</div>
          )}
        </div>
      </div>
    </button>
  )
}

function CustomInputRow({
  index,
  isSelected,
  value,
  onChange,
  onSelect,
  disabled,
}: {
  index: number
  isSelected: boolean
  value: string
  onChange: (value: string) => void
  onSelect: () => void
  disabled?: boolean
}) {
  return (
    <div
      className={`px-spacing-3 py-spacing-3 w-full text-left transition-all duration-200 ${isSelected ? 'bg-primary/10' : 'bg-transparent'} ${disabled ? 'opacity-50' : ''}`}
    >
      <div className="gap-spacing-3 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              onChange(e.target.value)
              if (!isSelected) onSelect()
            }}
            onFocus={() => {
              if (!isSelected) onSelect()
            }}
            disabled={disabled}
            placeholder="Type something else..."
            className="body-2 text-foreground placeholder:text-muted-foreground w-full bg-transparent focus:outline-none"
          />
        </div>
        <div
          className={`body-3 rounded-spacing-1 flex h-6 w-6 flex-shrink-0 items-center justify-center font-medium ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >
          {index}
        </div>
      </div>
    </div>
  )
}

export function ClarificationQuestionStep({
  question,
  answer,
  onAnswer,
  disabled,
}: {
  question: ClarificationQuestion
  answer: string | string[] | undefined
  onAnswer: (value: string | string[]) => void
  disabled?: boolean
}) {
  const [customText, setCustomText] = useState('')

  if (question.type === 'multiple_choice') {
    const selectedValues = Array.isArray(answer) ? answer : []
    return (
      <>
        {question.options.map((option, index) => (
          <MultiChoiceOptionRow
            key={option.id}
            option={option}
            isSelected={selectedValues.includes(option.id)}
            onToggle={() => {
              const newValues = selectedValues.includes(option.id)
                ? selectedValues.filter((value) => value !== option.id)
                : [...selectedValues, option.id]
              onAnswer(newValues)
            }}
            disabled={disabled}
            isLast={index === question.options.length - 1}
          />
        ))}
      </>
    )
  }

  const selectedValue = typeof answer === 'string' ? answer : ''
  const isCustomSelected = selectedValue.startsWith('__custom__')

  return (
    <>
      {question.options.map((option, index) => (
        <ChoiceOptionRow
          key={option.id}
          option={option}
          index={index}
          isSelected={selectedValue === option.id}
          onSelect={() => onAnswer(option.id)}
          disabled={disabled}
          isLast={false}
        />
      ))}
      <CustomInputRow
        index={question.options.length + 1}
        isSelected={isCustomSelected}
        value={customText}
        onChange={(text) => {
          setCustomText(text)
          onAnswer(`__custom__:${text}`)
        }}
        onSelect={() => onAnswer(`__custom__:${customText}`)}
        disabled={disabled}
      />
    </>
  )
}
