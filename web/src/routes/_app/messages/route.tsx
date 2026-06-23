import { createFileRoute } from '@tanstack/react-router'
import { MessagesPage } from '@/features/messages/messages-page'

export const Route = createFileRoute('/_app/messages')({
  component: MessagesPage,
})
