import { Link, NavLink, useNavigate } from 'react-router'
import { LayoutDashboard, LogOut, Ticket, Users, type LucideIcon } from 'lucide-react'
import { Role } from '@ticket/core'
import { authClient, useSession } from '../lib/auth-client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function NavItem({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('size-4', isActive && 'text-primary')} aria-hidden="true" />
          {label}
        </>
      )}
    </NavLink>
  )
}

export function Nav() {
  const { data: session } = useSession()
  const navigate = useNavigate()

  async function handleSignOut() {
    await authClient.signOut()
    navigate('/login', { replace: true })
  }

  const name = session?.user.name ?? ''

  return (
    <nav className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/90 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 text-base font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Ticket className="size-4" aria-hidden="true" />
          </span>
          Ticket Management System
        </Link>
        <div className="flex items-center gap-1">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/tickets" icon={Ticket} label="Tickets" />
          {session?.user.role === Role.Admin && <NavItem to="/users" icon={Users} label="Users" />}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span
            className="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
            aria-hidden="true"
          >
            {name.charAt(0).toUpperCase()}
          </span>
          <span className="text-sm font-medium">{name}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut aria-hidden="true" />
          Sign Out
        </Button>
      </div>
    </nav>
  )
}
