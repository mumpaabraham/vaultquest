import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { collection, collectionGroup, query, where, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';

const NAV = [
  { to: '/',             icon: '⬡',  label: 'Dashboard'   },
  { to: '/users',        icon: '👥',  label: 'Users'       },
  { to: '/deposits',     icon: '↓',   label: 'Deposits',    badgeKey: 'deposits'    },
  { to: '/withdrawals',  icon: '↑',   label: 'Withdrawals', badgeKey: 'withdrawals' },
  { to: '/packages',     icon: '📦',  label: 'Packages'    },
  { to: '/investments',  icon: '📈',  label: 'Investments' },
  { to: '/settings',     icon: '⚙',   label: 'Settings'    },
  { to: '/live-spins',    icon: '🎰',  label: 'Live Spins'     },
  { to: '/notifications', icon: '🔔',  label: 'Notifications'  },
  { to: '/app-versions',  icon: '📱',  label: 'App Versions'   },
];

function usePendingCounts() {
  const [counts, setCounts] = useState({ deposits: 0, withdrawals: 0 });
  useEffect(() => {
    const unsubD = onSnapshot(
      query(collection(db, 'deposits'), where('status', '==', 'pending')),
      snap => setCounts(c => ({ ...c, deposits: snap.size }))
    );
    const unsubW = onSnapshot(
      query(collectionGroup(db, 'withdrawals'), where('status', '==', 'pending')),
      snap => setCounts(c => ({ ...c, withdrawals: snap.size }))
    );
    return () => { unsubD(); unsubW(); };
  }, []);
  return counts;
}

interface Props { adminEmail: string | null }

export function Sidebar({ adminEmail }: Props) {
  const navigate = useNavigate();
  const pending  = usePendingCounts();

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-text">VAULTQUEST</div>
        <div className="sidebar-logo-sub">ADMIN DASHBOARD</div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ to, icon, label, badgeKey }) => {
          const count = badgeKey ? pending[badgeKey as keyof typeof pending] : 0;
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{icon}</span>
              {label}
              {count > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  minWidth: 20, height: 20,
                  borderRadius: 10,
                  background: badgeKey === 'withdrawals' ? 'var(--red)' : 'var(--green)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 5px',
                }}>
                  {count}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <strong>{adminEmail ?? 'Admin'}</strong>
        <button className="sidebar-signout btn" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
