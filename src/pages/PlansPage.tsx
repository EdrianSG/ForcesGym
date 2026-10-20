import { useCachedResource } from "@/hooks/useCachedResource";
import { plansCache } from "@/services/pageCaches";
import { LoadError } from "@/components/ui/LoadError";
import type { FormEvent } from "react";
import { Edit, Plus, X } from "lucide-react";
import { useState } from "react";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  createPlan,
  togglePlanActive,
  updatePlan,
} from "@/services/plansService";
import type { MembershipPlan } from "@/types";
import { formatMoney } from "@/utils/dates";
import { cn } from "@/utils/cn";

export function PlansPage() {
  const { data, loading, error: loadError, retry } = useCachedResource(plansCache);
  const plans = data ?? [];
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTogglePlan(id: string, currentActive: boolean) {
    setError(null);
    try {
      await togglePlanActive(id, !currentActive);
    } catch {
      setError("No se pudo cambiar el estado del plan. Intenta nuevamente.");
    }
  }

  async function handleSavePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingPlan || saving) return;

    setSaving(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const price = Number(formData.get("price"));
    const duration_days = Number(formData.get("duration_days"));

    try {
      await updatePlan(editingPlan.id, { name, price, duration_days });
      setEditingPlan(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al actualizar el plan.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCreatePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const price = Number(formData.get("price"));
    const duration_days = Number(formData.get("duration_days"));

    try {
      await createPlan({
        name,
        price,
        duration_days,
        active: true,
      });
      setShowNewModal(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al crear el nuevo plan.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loadError && data === null) {
    return <LoadError message="No se pudieron cargar los datos. Intenta nuevamente." onRetry={retry} />;
  }

  return (
    <div>
      <PageHeader
        title="Planes de Membresía"
        description="Gestiona los planes disponibles, agrega nuevos o modifica sus precios en tiempo real."
        actions={
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="size-4" />
            Nuevo plan
          </Button>
        }
      />

      {error && !editingPlan && !showNewModal ? <p role="alert" className="mb-3 text-status-expired">{error}</p> : null}
      {loadError ? <LoadError message="No se pudieron actualizar los datos. Se conserva la última vista disponible." onRetry={retry} /> : null}

      <Card>
        <div className="overflow-x-auto">
          <table
            aria-busy={loading}
            className="w-full min-w-[640px] text-left text-sm"
          >
            <thead className="border-b border-line bg-canvas/70 text-xs font-medium tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Precio (S/.)</th>
                <th className="px-4 py-3">Duración</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <TableSkeleton
                  columns={5}
                  label="Cargando catálogo de planes…"
                />
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-canvas/60">
                    <td className="px-4 py-3 font-medium text-ink">
                      {plan.name}
                    </td>
                    <td className="px-4 py-3 font-semibold text-ink">
                      {formatMoney(plan.price)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {plan.duration_days} días
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          plan.active
                            ? "bg-status-active-bg text-status-active"
                            : "bg-canvas text-muted",
                        )}
                      >
                        {plan.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setEditingPlan(plan)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-ink underline-offset-4 hover:underline"
                        >
                          <Edit className="size-3.5" />
                          Editar precio
                        </button>
                        <span className="text-line">|</span>
                        <button
                          type="button"
                          onClick={() => handleTogglePlan(plan.id, plan.active)}
                          className="text-xs font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
                        >
                          {plan.active ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de Crear Nuevo Plan */}
      {showNewModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h2 className="text-lg font-semibold text-ink">
                Crear Nuevo Plan
              </h2>
              <button
                type="button"
                disabled={saving}
                  onClick={() => setShowNewModal(false)}
                className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">
                  Nombre del Plan
                </span>
                <input
                  name="name"
                  placeholder="Ej. Plan Trimestral VIP"
                  required
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">
                  Precio (S/.)
                </span>
                <input
                  type="number"
                  name="price"
                  step="0.01"
                  min="0"
                  placeholder="150.00"
                  required
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink font-semibold outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">
                  Duración (Días)
                </span>
                <input
                  type="number"
                  name="duration_days"
                  min="1"
                  placeholder="30"
                  defaultValue="30"
                  required
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                />
              </label>

              {error ? (
                <p role="alert" className="text-sm font-medium text-status-expired">
                  {error}
                </p>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saving}
                  onClick={() => setShowNewModal(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando…" : "Crear Plan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Modal de edición de precio y plan */}
      {editingPlan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h2 className="text-lg font-semibold text-ink">
                Editar Plan — {editingPlan.name}
              </h2>
              <button
                type="button"
                disabled={saving}
                  onClick={() => setEditingPlan(null)}
                className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">
                  Nombre del Plan
                </span>
                <input
                  name="name"
                  defaultValue={editingPlan.name}
                  required
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">
                  Precio (S/.)
                </span>
                <input
                  type="number"
                  name="price"
                  step="0.01"
                  min="0"
                  defaultValue={editingPlan.price}
                  required
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink font-semibold outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">
                  Duración (Días)
                </span>
                <input
                  type="number"
                  name="duration_days"
                  min="1"
                  defaultValue={editingPlan.duration_days}
                  required
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                />
              </label>

              {error ? (
                <p role="alert" className="text-sm font-medium text-status-expired">
                  {error}
                </p>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saving}
                  onClick={() => setEditingPlan(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando…" : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
