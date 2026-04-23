import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Pencil, Check, RotateCcw } from "lucide-react";
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCorners, defaultDropAnimationSideEffects } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import api, { formatApiError } from "../lib/api";
import { Card, EmptyState, ErrorBanner, Page, PageHeader, Skel } from "../components/Shared";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { Receipt } from "lucide-react";
import SortableWidget from "../components/widgets/SortableWidget";
import { WIDGETS, DEFAULT_LAYOUT } from "../components/widgets/registry";

const dropAnimationConfig = {
  duration: 220,
  easing: "cubic-bezier(0.22, 0.9, 0.4, 1)",
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.4" } },
  }),
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({ insights: null, alerts: [], transactions: [], headline: null, pacing: null, goals: [] });
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [activeRect, setActiveRect] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadAll = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const [i, a, t, h, p, g, prefs] = await Promise.all([
        api.get("/insights"),
        api.get("/alerts"),
        api.get("/transactions?limit=10"),
        api.get("/insights/headline"),
        api.get("/insights/pacing"),
        api.get("/goals"),
        api.get("/preferences/dashboard"),
      ]);
      setData({ insights: i.data, alerts: a.data, transactions: t.data, headline: h.data, pacing: p.data, goals: g.data });
      const saved = prefs.data?.widgets;
      if (saved && saved.length > 0) {
        // Filter unknown ids + add missing ones at end with defaults
        const known = saved.filter(w => WIDGETS[w.id]);
        const existingIds = new Set(known.map(w => w.id));
        const missing = DEFAULT_LAYOUT.filter(w => !existingIds.has(w.id));
        setLayout([...known, ...missing]);
      }
    } catch (e) { setErr(formatApiError(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const save = useCallback(async (next) => {
    try {
      await api.put("/preferences/dashboard", { widgets: next });
      setDirty(false);
    } catch (e) { toast.error(formatApiError(e)); }
  }, []);

  const resize = (id, size) => {
    setLayout(prev => {
      const next = prev.map(w => w.id === id ? { ...w, size } : w);
      setDirty(true);
      save(next);
      return next;
    });
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
    const initial = event.active.rect.current.initial;
    if (initial) setActiveRect({ width: initial.width, height: initial.height });
  };

  const handleDragEnd = (event) => {
    setActiveId(null);
    setActiveRect(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLayout(prev => {
      const oldIdx = prev.findIndex(w => w.id === active.id);
      const newIdx = prev.findIndex(w => w.id === over.id);
      if (oldIdx < 0 || newIdx < 0) return prev;
      const next = arrayMove(prev, oldIdx, newIdx);
      save(next);
      setDirty(true);
      return next;
    });
  };

  const handleDragCancel = () => { setActiveId(null); setActiveRect(null); };

  const reset = async () => {
    setLayout(DEFAULT_LAYOUT);
    await save(DEFAULT_LAYOUT);
    toast.success("Layout reset");
  };

  const finishEdit = () => {
    setEditMode(false);
    if (dirty) toast.success("Layout saved");
  };

  const ids = useMemo(() => layout.map(w => w.id), [layout]);
  const activeWidget = activeId ? layout.find(w => w.id === activeId) : null;
  const hasAnyData = data.insights && (data.insights.txn_count_this_month > 0 || data.alerts.length > 0);

  return (
    <Page>
      <PageHeader
        title={`Good ${greeting()}, ${(user?.name || "there").split(" ")[0]}`}
        subtitle={editMode ? "Drag to reorder. Pick a size S, M, or L per card." : "A calm look at where your money is this month."}
        right={
          <div className="flex items-center gap-2">
            {editMode ? (
              <>
                <Button variant="ghost" size="sm" onClick={reset} data-testid="reset-layout-btn">
                  <RotateCcw size={14} className="mr-1.5" /> Reset
                </Button>
                <Button size="sm" onClick={finishEdit} data-testid="done-edit-btn" className="bg-moss hover:bg-moss-hover text-white">
                  <Check size={14} className="mr-1.5" /> Done
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)} data-testid="edit-layout-btn">
                <Pencil size={14} className="mr-1.5" /> Customize
              </Button>
            )}
          </div>
        }
      />

      {err && <div className="mb-6"><ErrorBanner message={err} onRetry={loadAll} /></div>}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Skel className="h-40 md:col-span-3" />
          <Skel className="h-40 md:col-span-2" /><Skel className="h-40" />
          <Skel className="h-56 md:col-span-3" />
          <Skel className="h-56 md:col-span-2" /><Skel className="h-56" />
        </div>
      ) : !hasAnyData ? (
        <Card className="p-8">
          <EmptyState
            icon={Receipt}
            title="Your first month starts here"
            body="Add a transaction to see your safe-to-spend, category breakdown, and alerts come alive."
            action={<Link to="/transactions"><Button className="bg-moss hover:bg-moss-hover text-white" data-testid="empty-add-btn">Add your first transaction</Button></Link>}
            testid="dashboard-empty"
          />
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start" data-testid="dashboard-grid">
              {layout.map(w => (
                <SortableWidget key={w.id} id={w.id} size={w.size} editMode={editMode} onResize={resize} data={data} />
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={dropAnimationConfig} adjustScale={false}>
            {activeWidget && activeRect ? (
              <div style={{ width: activeRect.width, height: activeRect.height }}>
                <SortableWidget id={activeWidget.id} size={activeWidget.size} editMode={false} data={data} isOverlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </Page>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "night";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}
