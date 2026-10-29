import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
const fake = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
  onChange: undefined as
    undefined | ((event: AuthChangeEvent, s: Session | null) => void),
}));
vi.mock("@/lib/supabase", () => ({
  publicConfig: { url: "https://example.test", key: "public" },
  getSupabaseClient: () => ({
    auth: {
      getSession: fake.getSession,
      signOut: fake.signOut,
      onAuthStateChange: (cb: typeof fake.onChange) => {
        fake.onChange = cb;
        return { data: { subscription: { unsubscribe: fake.unsubscribe } } };
      },
    },
  }),
}));
import { AuthProvider } from "./auth-provider";
import { useAuth } from "./auth-context";
const session = { user: { id: "a" }, access_token: "test" } as Session;
function Probe() {
  const a = useAuth();
  return (
    <>
      <p>{a.loading ? "loading" : (a.session?.user.id ?? "signed out")}</p>
      <p>{a.expired ? "expired" : ""}</p>
      <p>{a.recovery ? "recovery" : ""}</p>
    </>
  );
}
function mount() {
  const cache = new QueryClient();
  cache.setQueryData(["profile", "old"], { private: true });
  return {
    cache,
    ...render(
      <QueryClientProvider client={cache}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </QueryClientProvider>,
    ),
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  fake.getSession.mockResolvedValue({ data: { session }, error: null });
});
it("restores the session and clears private cache when the identity expires", async () => {
  const { cache } = mount();
  await screen.findByText("a");
  act(() => fake.onChange?.("SIGNED_OUT", null));
  await screen.findByText("expired");
  expect(cache.getQueryData(["profile", "old"])).toBeUndefined();
});
it("never restores a stale initial session after sign out", async () => {
  let resolve!: (value: unknown) => void;
  fake.getSession.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  mount();
  act(() => fake.onChange?.("SIGNED_OUT", null));
  await act(async () => resolve({ data: { session }, error: null }));
  expect(screen.getByText("signed out")).toBeInTheDocument();
});
it("routes recovery independently and unsubscribes on unmount", async () => {
  const { unmount } = mount();
  await screen.findByText("a");
  act(() => fake.onChange?.("PASSWORD_RECOVERY", session));
  await waitFor(() => expect(screen.getByText("recovery")).toBeInTheDocument());
  unmount();
  expect(fake.unsubscribe).toHaveBeenCalled();
});
it("shows initialization failures without pretending the user is authenticated", async () => {
  fake.getSession.mockRejectedValue(new Error("network"));
  function ErrorProbe() {
    const a = useAuth();
    return <p role="alert">{a.error}</p>;
  }
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <ErrorProbe />
      </AuthProvider>
    </QueryClientProvider>,
  );
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Impossible de vérifier la session",
    ),
  );
});
