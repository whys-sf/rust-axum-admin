import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { PERM, usePermission } from '@/lib/permissions'
import { InboxPanel } from '@/features/messages/inbox-panel'
import { SentPanel } from '@/features/messages/sent-panel'

export function MessagesPage() {
  const canManage = usePermission(PERM.messageList)
  const [tab, setTab] = useState('inbox')

  return (
    <Card>
      <CardHeader>
        <CardTitle>消息中心</CardTitle>
      </CardHeader>
      <CardContent>
        {canManage ? (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="inbox">收件箱</TabsTrigger>
              <TabsTrigger value="sent">发件管理</TabsTrigger>
            </TabsList>
            <TabsContent value="inbox" className="pt-4">
              <InboxPanel />
            </TabsContent>
            <TabsContent value="sent" className="pt-4">
              <SentPanel />
            </TabsContent>
          </Tabs>
        ) : (
          <InboxPanel />
        )}
      </CardContent>
    </Card>
  )
}
