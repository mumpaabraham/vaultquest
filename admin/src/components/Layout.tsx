import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface Props {
  children: ReactNode;
  adminEmail: string | null;
  title: string;
  actions?: ReactNode;
}

export function Layout({ children, adminEmail, title, actions }: Props) {
  return (
    <div className="app-shell">
      <Sidebar adminEmail={adminEmail} />
      <div className="main-area">
        <header className="topbar">
          <span className="topbar-title">{title}</span>
          {actions}
        </header>
        <main className="page-body">{children}</main>
      </div>
    </div>
  );
}
