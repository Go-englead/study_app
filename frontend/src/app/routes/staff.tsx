import { createFileRoute } from '@tanstack/react-router'
import { StaffScreen } from '../../features/staff/components/staff-screen'

export const Route = createFileRoute('/staff')({
  component: StaffScreen,
})
