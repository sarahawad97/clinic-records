import { formatDateTime, formatPersonName } from '../format'
import { useMessages } from '../i18n'
import { useClinic } from '../store'
import { fill } from '../text'

export function usePersonName(id: string | null | undefined) {
  const { state } = useClinic()
  const m = useMessages()
  const person = state.staff.find((member) => member.id === id) ?? state.patients.find((patient) => patient.id === id)
  if (!person) return m.common.unknownStaff
  return formatPersonName(person, state.settings.nameOrder)
}

export function RecordMeta({ at, authorId }: { at: string; authorId: string }) {
  const { state } = useClinic()
  const m = useMessages()
  const name = usePersonName(authorId)
  return (
    <p className="meta">
      {fill(m.common.recordedBy, {
        when: formatDateTime(at, state.settings.intlLocale),
        name,
      })}
    </p>
  )
}
