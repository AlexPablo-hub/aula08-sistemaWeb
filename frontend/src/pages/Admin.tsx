import { AccountsPanel } from '@/components/admin/AccountsPanel'
import { TranscriptionSettingsPanel } from '@/components/admin/TranscriptionSettingsPanel'
import { AppShell, PageContainer, PageHeader, UserArea, useAppNavigation } from '@/components/layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

/** Administração: contas e configuração de transcrição, em abas. */
export default function Admin() {
  const navigation = useAppNavigation()

  return (
    <AppShell navigation={navigation} userArea={<UserArea />}>
      <PageContainer>
        <PageHeader
          title="Administração"
          description="Gerencie as contas e escolha o modelo de transcrição."
        />

        <Tabs defaultValue="accounts" className="gap-6">
          <TabsList aria-label="Seções da administração">
            <TabsTrigger value="accounts">Contas</TabsTrigger>
            <TabsTrigger value="transcription">Transcrição</TabsTrigger>
          </TabsList>
          <TabsContent value="accounts">
            <AccountsPanel />
          </TabsContent>
          <TabsContent value="transcription">
            <TranscriptionSettingsPanel />
          </TabsContent>
        </Tabs>
      </PageContainer>
    </AppShell>
  )
}
