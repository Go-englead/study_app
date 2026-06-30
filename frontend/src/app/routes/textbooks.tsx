import { createFileRoute } from '@tanstack/react-router'
import { TextbooksPage } from '../../features/textbooks/components/textbooks-page'

export const Route = createFileRoute('/textbooks')({
  component: TextbooksPage,
})
