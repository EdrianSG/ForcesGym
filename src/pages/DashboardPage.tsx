import { LoadError } from "@/components/ui/LoadError";
import { AlertTriangle, Clock3, UserRound, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardSkeleton } from "@/components/skeletons/PageSkeletons";
import { StatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { dashboardCache } from "@/services/dashboardService";
import { formatDate, formatMoney } from "@/utils/dates";
import { getMembershipStatus } from "@/utils/membership";

export function DashboardPage() {
  const [snapshot, setSnapshot] = useState(() => dashboardCache.peek());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [today, setToday] = useState(() => new Date().setHours(0, 0, 0, 0));
  const members = useMemo(() => snapshot?.members ?? [], [snapshot]);
  const subscriptions = useMemo(() => snapshot?.subscriptions ?? [], [snapshot]);

  useEffect(() => {
    let active = true;
    const refresh = (force = false) => {
      if (document.visibilityState === "hidden") return;
      setToday(new Date().setHours(0, 0, 0, 0));
      void dashboardCache.get(force).then((data) => {
        if (active) {
          // A sign-out or mutation may invalidate an in-flight response.
          setSnapshot(dashboardCache.peek());
          if (dashboardCache.peek() === data) setLoadError(null);
          else refresh();
        }
      }).catch(() => {
        if (active) setLoadError("No se pudo actualizar el resumen. Los datos anteriores pueden estar desactualizados.");
      });
    };
    const onVisible = () => refresh();
    const unsubscribe = dashboardCache.subscribe(() => {
      setSnapshot(dashboardCache.peek());
      refresh();
    });
    refresh(retry > 0);
    const interval = window.setInterval(onVisible, 30_000);
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      unsubscribe();
      window.clearInterval(interval);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [retry]);

  const stats = useMemo(
    () => [
      {
        label: "Clientes registrados",
        value: members.length,
        icon: Users,
      },
      {
        label: "Membresías activas",
        value: members.filter(
          (m) => getMembershipStatus(m.current_end_date, new Date(today)) === "ACTIVO",
        ).length,
        icon: UserRound,
      },
      {
        label: "Membresías vencidas",
        value: members.filter(
          (m) => getMembershipStatus(m.current_end_date, new Date(today)) === "VENCIDO",
        ).length,
        icon: AlertTriangle,
      },
      {
        label: "Vencen próximamente",
        value: members.filter(
          (m) => getMembershipStatus(m.current_end_date, new Date(today)) === "PRÓXIMO A VENCER",
        ).length,
        icon: Clock3,
      },
    ],
    [members, today],
  );

  const latestRenewals = subscriptions;

  const expiringSoon = useMemo(
    () =>
      members.filter(
        (m) => getMembershipStatus(m.current_end_date, new Date(today)) === "PRÓXIMO A VENCER",
      ),
    [members, today],
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Resumen operativo del gimnasio."
      />

      {loadError ? <LoadError message={loadError} onRetry={() => setRetry((value) => value + 1)} /> : null}
      {!snapshot ? (
        loadError ? null :
        <DashboardSkeleton />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ label, value, icon: Icon }) => (
              <Card key={label} className="p-5">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted">{label}</p>
                  <Icon className="size-4 text-muted" />
                </div>
                <p className="mt-3 text-3xl font-semibold tracking-tight">
                  {value}
                </p>
              </Card>
            ))}
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <div className="border-b border-line px-5 py-4">
                <h2 className="text-sm font-semibold">Últimas renovaciones</h2>
              </div>
              <ul className="divide-y divide-line">
                {latestRenewals.map((subscription) => (
                  <li
                    key={subscription.id}
                    className="flex items-center justify-between gap-4 px-5 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {subscription.member_name}
                      </p>
                      <p className="text-xs text-muted">
                        {subscription.plan_name} ·{" "}
                        {formatDate(subscription.start_date)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium">
                      {formatMoney(subscription.price_paid)}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="lg:col-span-2">
              <div className="border-b border-line px-5 py-4">
                <h2 className="text-sm font-semibold">
                  Clientes próximos a vencer
                </h2>
              </div>
              {expiringSoon.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted">
                  No hay vencimientos próximos.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {expiringSoon.map((member) => (
                    <li key={member.id}>
                      <Link
                        to={`/members/${member.id}`}
                        className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-canvas/80"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {member.full_name}
                          </p>
                          <p className="font-mono text-xs text-muted">
                            #{member.membership_number}
                          </p>
                        </div>
                        <StatusBadge
                          status={getMembershipStatus(member.current_end_date)}
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
