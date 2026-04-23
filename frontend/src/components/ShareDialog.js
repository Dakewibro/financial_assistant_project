import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Copy, Check, Link2, Users, Trash2 } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { toast } from "sonner";

export default function ShareDialog({ open, onClose, resource, kind, onChanged }) {
  const [token, setToken] = useState(resource?.share_token || null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setToken(resource?.share_token || null);
      setCopied(false);
    }
  }, [open, resource]);

  const url = token ? `${window.location.origin}/join/${token}` : "";

  const createLink = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/${kind}s/${resource.id}/share`);
      setToken(data.token);
      onChanged && onChanged();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };

  const revoke = async () => {
    if (!window.confirm("Revoke this link? Anyone who hasn't joined yet will lose access.")) return;
    setLoading(true);
    try {
      await api.delete(`/${kind}s/${resource.id}/share`);
      setToken(null);
      toast.success("Link revoked · members removed");
      onChanged && onChanged();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select and copy manually.");
    }
  };

  const members = resource?.members || [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[440px] bg-white" data-testid="share-dialog" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Users size={16} className="text-moss" /> Share {kind}
          </DialogTitle>
        </DialogHeader>

        <div className="pt-2">
          <div className="text-sm font-medium mb-1">{resource?.name}</div>
          <div className="text-xs text-[color:var(--text-secondary)] leading-relaxed mb-4">
            {kind === "goal"
              ? "Shared goals let others contribute to progress. Their personal transactions stay private."
              : "Shared budgets track spending from both sides in this category. Only the total counts toward the limit — individual transactions stay in each person's own history."}
          </div>

          {!token ? (
            <div className="p-5 rounded-lg border-2 border-dashed border-sand-200 text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-moss-soft text-moss flex items-center justify-center mb-3"><Link2 size={17} /></div>
              <div className="font-medium text-sm">Create a share link</div>
              <div className="text-xs text-[color:var(--text-secondary)] mt-1">Generate a one-tap join link you can send to anyone.</div>
              <Button onClick={createLink} disabled={loading} data-testid="create-share-btn" className="mt-4 bg-moss hover:bg-moss-hover text-white">
                {loading ? "Creating..." : "Create share link"}
              </Button>
            </div>
          ) : (
            <>
              <label className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">Share link</label>
              <div className="mt-1.5 flex gap-2">
                <Input value={url} readOnly data-testid="share-url" className="font-mono text-xs" onClick={(e) => e.target.select()} />
                <Button onClick={copy} data-testid="copy-share-btn" variant="outline" className="flex-shrink-0">
                  {copied ? <Check size={14} className="mr-1.5 text-moss" /> : <Copy size={14} className="mr-1.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>

              {members.length > 0 && (
                <div className="mt-5">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-secondary)] mb-2">Members ({members.length})</div>
                  <div className="space-y-1.5" data-testid="share-members">
                    {members.map(m => (
                      <div key={m.id} className="flex items-center gap-2.5 p-2 rounded-md bg-sand-50">
                        <div className="w-7 h-7 rounded-full bg-moss-soft text-moss flex items-center justify-center text-xs font-medium">
                          {(m.name || "?").slice(0, 1).toUpperCase()}
                        </div>
                        <div className="flex-1 text-sm">{m.name}</div>
                        {m.is_owner && <span className="text-[10px] text-moss bg-moss-soft px-1.5 py-0.5 rounded">Owner</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={revoke} disabled={loading} data-testid="revoke-share-btn"
                className="mt-5 text-xs text-terracotta hover:underline flex items-center gap-1.5">
                <Trash2 size={11} /> Revoke link & remove all members
              </button>
            </>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="ghost" onClick={onClose} data-testid="share-close-btn">Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
