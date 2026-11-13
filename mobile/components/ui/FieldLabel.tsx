import { Text } from 'react-native'
import { type as typography } from '../../lib/typography'

export function FieldLabel({ children, optional }: { children: string; optional?: boolean }) {
  return (
    <Text style={[typography.label, { marginBottom: 8, marginTop: 16 }]}>
      {children}
      {optional ? ' (opcional)' : ''}
    </Text>
  )
}
