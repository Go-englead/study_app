import { createFileRoute } from '@tanstack/react-router'
import { TextbooksScreen } from '../../features/textbooks/components/textbooks-screen'

export const Route = createFileRoute('/textbooks')({
  component: TextbooksScreen,
})
