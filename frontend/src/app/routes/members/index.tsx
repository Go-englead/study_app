import { createFileRoute } from '@tanstack/react-router'
import { MembersScreen } from '../../../features/members/components/members-screen'

export const Route = createFileRoute('/members/')({
  component: MembersScreen,
})
