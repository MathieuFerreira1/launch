import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  Home,
  Layers,
  Plus,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, InlineError, LoadingState } from "@/components/ui/states";
import {
  DemoSessionContext,
  useDemoSession,
} from "@/features/auth/demo-session";
import { WelcomePage } from "@/features/auth/welcome-page";
import { AuthPage, UpdatePasswordPage } from "@/features/auth/auth-page";
import { AuthProvider } from "@/features/auth/auth-provider";
import { useAuth } from "@/features/auth/auth-context";
import { HomePage } from "@/features/home/home-page";
import { CollectionsPage } from "@/features/collections/collections-page";
import { CardPage } from "@/features/cards/card-page";
import {
  ActivitiesPage,
  ActivityPage,
} from "@/features/activities/activities-page";
import { SourcesPage } from "@/features/activities/sources-page";
import { BulkImportPage } from "@/features/imports/bulk-import-page";
import {
  AccountActivities,
  AccountActivity,
  ManualActivity,
} from "@/features/activities/account-activities";
import { ImportPage } from "@/features/imports/import-page";
import { ProfilePage } from "@/features/profile/profile-page";
import { useDemoData } from "@/lib/demo";
import { AccountHome } from "@/features/home/account-home";
import { AccountCollections } from "@/features/collections/account-collections";
import { AccountCard } from "@/features/cards/account-card";
import { RewardsProvider } from "@/features/cards/rewards-context";
import { RevealPage } from "@/features/reveals/reveal-page";
import { AccountProfile } from "@/features/profile/account-profile";
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});
const tabs = [
  { to: "/app", label: "Accueil", icon: Home },
  { to: "/collections", label: "Collections", icon: Layers },
  { to: "/activities", label: "Activités", icon: Activity },
  { to: "/profile", label: "Profil", icon: UserRound },
];
function RouteFocus() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector<HTMLElement>("h1")?.focus();
  }, [pathname]);
  return null;
}
function Shell() {
  const { session } = useAuth();
  const { pathname } = useLocation();
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return (
    <div
      className={
        session && pathname.startsWith("/reveal/") ? "reveal-shell" : undefined
      }
    >
      <a href="#main" className="skip-link">
        Aller au contenu
      </a>
      <header className="topbar">
        <Link to="/" className="wordmark" aria-label="Launch, accueil">
          launch<span>.</span>
        </Link>
        <nav className="desktop-nav" aria-label="Navigation principale">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to}>
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="top-actions">
          {!session && <span className="demo-badge">DÉMO</span>}
          <Button asChild variant="outline">
            <Link to="/import">
              <Plus size={17} />
              <span>Activité</span>
            </Link>
          </Button>
        </div>
      </header>
      <div className="demo-strip">
        {session
          ? "Ton histoire et tes collections restent privées."
          : "Un aperçu de Launch. Données fictives, vrais objectifs."}
        <ArrowUpRight size={13} />
      </div>
      {!online && (
        <p className="offline" role="status">
          Hors ligne · Vérifie ta connexion avant d’enregistrer des
          modifications.
        </p>
      )}
      <main id="main">
        <Outlet />
      </main>
      <footer className="desktop-footer">
        <span>launch. — Tes efforts méritent d’être collectionnés.</span>
        <span>
          {session
            ? "Collection personnelle · Non certifiée"
            : "Démo V1 · Collection privée"}
        </span>
      </footer>
      <nav className="bottom-nav" aria-label="Navigation mobile">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to}>
            <t.icon size={21} />
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
      <RouteFocus />
    </div>
  );
}
function DemoGuard() {
  const { active } = useDemoSession();
  const auth = useAuth();
  const location = useLocation();
  if (auth.loading) return <LoadingState />;
  if (auth.error) return <InlineError retry={auth.retry} />;
  if (auth.expired && !auth.session)
    return <Navigate to="/auth?expired=1" replace />;
  return auth.session && !auth.recovery ? (
    <Outlet />
  ) : auth.recovery ? (
    <Navigate to="/auth/update-password" replace />
  ) : active ? (
    <Outlet />
  ) : (
    <Navigate
      to={`/auth?next=${encodeURIComponent(location.pathname)}${auth.expired ? "&expired=1" : ""}`}
      replace
    />
  );
}
function DataRoutes() {
  const { session } = useAuth();
  if (!session) return <DemoDataRoutes />;
  return (
    <RewardsProvider>
      <Routes>
        <Route path="/app" element={<AccountHome />} />
        <Route path="/collections" element={<AccountCollections />} />
        <Route
          path="/collections/:sportSlug"
          element={<AccountCollections />}
        />
        <Route path="/cards/:cardId" element={<AccountCard />} />
        <Route path="/reveal/:sessionId" element={<RevealPage />} />
        <Route path="/activities" element={<AccountActivities />} />
        <Route path="/activities/sources" element={<SourcesPage />} />
        <Route path="/activities/new" element={<ManualActivity />} />
        <Route path="/activities/:id" element={<AccountActivity />} />
        <Route path="/activities/import" element={<BulkImportPage />} />
        <Route path="/import" element={<BulkImportPage />} />
        <Route path="/profile" element={<AccountProfile />} />
        <Route
          path="*"
          element={<EmptyState title="Cette page n’existe pas" />}
        />
      </Routes>
    </RewardsProvider>
  );
}
function DemoDataRoutes() {
  const { session } = useAuth();
  const q = useDemoData();
  if (q.isPending) return <LoadingState />;
  if (q.isError) return <InlineError retry={() => void q.refetch()} />;
  return (
    <Routes>
      <Route
        path="/activities/sources"
        element={session ? <SourcesPage /> : <Navigate to="/auth" replace />}
      />
      <Route
        path="/demo/activities/:id"
        element={<ActivityPage data={q.data} />}
      />
      <Route path="/app" element={<HomePage data={q.data} />} />
      <Route path="/collections" element={<CollectionsPage data={q.data} />} />
      <Route
        path="/collections/:sportSlug"
        element={<CollectionsPage data={q.data} />}
      />
      <Route
        path="/cards/:cardId"
        element={
          <CardPage
            data={q.data}
            activityBasePath={session ? "/demo/activities" : "/activities"}
          />
        }
      />
      <Route
        path="/activities"
        element={
          session ? <AccountActivities /> : <ActivitiesPage data={q.data} />
        }
      />
      <Route
        path="/activities/new"
        element={session ? <ManualActivity /> : <Navigate to="/auth" replace />}
      />
      <Route
        path="/activities/:id"
        element={session ? <AccountActivity /> : <ActivityPage data={q.data} />}
      />
      <Route
        path="/activities/import"
        element={session ? <BulkImportPage /> : <ImportPage />}
      />
      <Route
        path="/import"
        element={session ? <BulkImportPage /> : <ImportPage />}
      />
      <Route path="/profile" element={<ProfilePage data={q.data} />} />
      <Route
        path="*"
        element={<EmptyState title="Cette page n’existe pas" />}
      />
    </Routes>
  );
}
function RootRoutes() {
  const { active } = useDemoSession();
  const auth = useAuth();
  const connected = active || !!auth.session;
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route
          index
          element={
            auth.loading ? (
              <LoadingState />
            ) : connected ? (
              <Navigate to="/app" replace />
            ) : (
              <WelcomePage />
            )
          }
        />
        <Route
          path="auth"
          element={
            auth.loading ? (
              <LoadingState />
            ) : connected ? (
              <Navigate to="/app" replace />
            ) : (
              <AuthPage />
            )
          }
        />
        <Route path="auth/signup" element={<AuthPage mode="signup" />} />
        <Route
          path="auth/forgot-password"
          element={<AuthPage mode="forgot" />}
        />
        <Route path="auth/update-password" element={<UpdatePasswordPage />} />
        <Route path="auth/callback" element={<AuthCallback />} />
        <Route element={<DemoGuard />}>
          <Route path="*" element={<DataRoutes />} />
        </Route>
      </Route>
    </Routes>
  );
}
function AuthCallback() {
  const auth = useAuth();
  const location = useLocation();
  if (
    new URLSearchParams(location.search).has("error") ||
    new URLSearchParams(location.hash.slice(1)).has("error")
  )
    return (
      <div className="empty panel">
        <h1>Ce lien ne fonctionne plus.</h1>
        <p>Il est expiré ou a déjà été utilisé.</p>
        <Link to="/auth/forgot-password">Demander un nouveau lien</Link>
      </div>
    );
  if (auth.loading) return <LoadingState />;
  if (auth.error) return <InlineError retry={auth.retry} />;
  return (
    <Navigate
      to={
        auth.recovery
          ? "/auth/update-password"
          : auth.session
            ? "/app"
            : "/auth?expired=1"
      }
      replace
    />
  );
}
export function App() {
  const [active, setActive] = useState(
    () => sessionStorage.getItem("launch-demo") === "true",
  );
  const enter = () => {
    sessionStorage.setItem("launch-demo", "true");
    setActive(true);
  };
  const leave = () => {
    sessionStorage.removeItem("launch-demo");
    queryClient.clear();
    setActive(false);
  };
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DemoSessionContext.Provider value={{ active, enter, leave }}>
          <BrowserRouter>
            <RootRoutes />
          </BrowserRouter>
        </DemoSessionContext.Provider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
