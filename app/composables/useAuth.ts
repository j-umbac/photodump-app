import type { User } from 'firebase/auth'

export const useAuth = () => {
  const user = useState<User | null>('fb-user', () => null)
  const loading = useState<boolean>('fb-auth-loading', () => true)

  return {
    user,
    loading
  }
}
