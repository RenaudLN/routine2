import {
  NumberInput, Rating, Select,
  Stack, Text, Textarea, TextInput, Box
} from '@mantine/core'
import type { RoutineField } from '../types'

interface RoutineFormFieldsProps {
  fields: RoutineField[]
  fieldValues: Record<string, string | number | null>
  setField: (name: string, value: string | number | null) => void
  validationErrors?: Record<string, string>
  readOnly?: boolean
}

export function RoutineFormFields({
  fields,
  fieldValues,
  setField,
  validationErrors = {},
  readOnly = false,
}: RoutineFormFieldsProps) {
  return (
    <Stack gap="lg">
      {fields.length === 0 && (
        <Box py="md">
          <Text c="dimmed" ta="center">This routine has no fields defined.</Text>
        </Box>
      )}

      {fields.map((field) => {
        const error = validationErrors[field.name]
        const value = fieldValues[field.name]

        return (
          <Box key={field.name}>
            {field.type === 'Text' && (
              <TextInput 
                label={field.name} 
                description={field.description}
                required={field.required} 
                error={error}
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => setField(field.name, e.currentTarget.value || null)}
                radius="md" 
                readOnly={readOnly}
              />
            )}

            {field.type === 'LongText' && (
              <Textarea 
                label={field.name} 
                description={field.description}
                required={field.required} 
                error={error}
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => setField(field.name, e.currentTarget.value || null)}
                autosize minRows={2} radius="md" 
                readOnly={readOnly}
              />
            )}

            {field.type === 'Number' && (
              <NumberInput 
                label={field.name} 
                description={field.description}
                required={field.required} 
                error={error}
                value={typeof value === 'number' ? value : ''}
                onChange={(val) => setField(field.name, val === '' ? null : Number(val))}
                radius="md"  
                readOnly={readOnly}
              />
            )}

            {field.type === 'Rating' && (
              <Stack gap={4}>
                <Text size="sm" fw={500}>
                  {field.name}
                  {field.required && <Text component="span" c="red" ml={4}>*</Text>}
                </Text>
                {field.description && <Text size="xs" c="dimmed">{field.description}</Text>}
                <Rating 
                  count={field.ratingMax ?? 5} 
                  fractions={2} 
                  value={typeof value === 'number' ? value : 0}
                  onChange={(val) => setField(field.name, val === 0 ? null : val)} 
                  size="xl" 
                  readOnly={readOnly}
                />
                {error && <Text size="xs" c="red">{error}</Text>}
              </Stack>
            )}

            {field.type === 'Date' && (
              <TextInput 
                label={field.name} 
                description={field.description}
                required={field.required} 
                error={error} 
                type="date"
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => setField(field.name, e.currentTarget.value || null)}
                radius="md"  
                readOnly={readOnly}
              />
            )}

            {field.type === 'Option' && (
              <Select 
                label={field.name} 
                description={field.description}
                required={field.required} 
                error={error}
                data={field.options ?? []}
                value={typeof value === 'string' ? value : null}
                onChange={(val) => setField(field.name, val)}
                clearable 
                radius="md"  
                readOnly={readOnly}
              />
            )}
          </Box>
        )
      })}
    </Stack>
  )
}
