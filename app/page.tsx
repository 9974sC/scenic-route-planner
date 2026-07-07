import { AuthProvider } from '@/components/auth-provider'
import { ScenicApp } from '@/components/scenic-app'

export default function Page() {
  return (
    <AuthProvider>
      <ScenicApp />
    </AuthProvider>
  )
}
