import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApi } from "@/lib/api";
import type { Notebook, User, Workspace } from "@/types";

const STORAGE_KEY = "mindora:workspace-id";

function readStoredWorkspaceId(): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

function writeStoredWorkspaceId(id: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(id));
  } catch {
    // Storage may be unavailable (private mode). The workspace still works
    // for this session, it just won't be remembered.
  }
}

interface LoadState {
  key: number;
  user: User | null;
  workspace: Workspace | null;
  workspaces: Workspace[];
  error: string | null;
}

export interface WorkspaceState {
  user: User | null;
  workspace: Workspace | null;
  /** Every workspace the user owns, for the switcher. */
  workspaces: Workspace[];
  notebooks: Notebook[];
  isInitialLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => void;
  createNotebook: (name: string) => Promise<Notebook>;
  deleteNotebook: (id: number) => Promise<void>;
  /** Switches to another workspace the user owns. */
  switchWorkspace: (id: number) => Promise<void>;
}

/**
 * Resolves the signed-in user's workspace and its notebooks.
 *
 * `GET /workspaces` lists everything the user owns, so the workspace is picked
 * from that list: the remembered one when it is still there, otherwise the
 * most recent. A workspace is only created when the list is genuinely empty.
 *
 * This replaced a cache-only scheme that stored a single id in local storage.
 * With no list route, a stale or cleared cache silently hid every other
 * workspace — the user could see that a notebook existed in the database and
 * had no way to reach it.
 */
export function useWorkspace(): WorkspaceState {
  const api = useApi();

  const [requestKey, setRequestKey] = useState(0);
  const [state, setState] = useState<LoadState>({
    key: -1,
    user: null,
    workspace: null,
    workspaces: [],
    error: null,
  });

  useEffect(() => {
    const key = requestKey;
    let active = true;

    async function load() {
      try {
        const [currentUser, available] = await Promise.all([
          api.getCurrentUser(),
          api.listWorkspaces(),
        ]);

        if (!active) return;

        const owned = available ?? [];
        const storedId = readStoredWorkspaceId();

        const remembered =
          storedId === null ? null : owned.find((w) => w.id === storedId);

        let resolved: Workspace | null = remembered ?? owned[0] ?? null;

        // Only a genuinely empty account gets a workspace created.
        if (!resolved) {
          const label = currentUser.name
            ? `${currentUser.name}'s workspace`
            : "My workspace";
          resolved = await api.createWorkspace(label);
          owned.unshift(resolved);

          if (active) {
            toast.success("Workspace created", {
              description: "A private knowledge space is ready for you.",
            });
          }
        }

        writeStoredWorkspaceId(resolved.id);

        if (!active) return;
        setState({
          key,
          user: currentUser,
          workspace: resolved,
          workspaces: owned,
          error: null,
        });
      } catch (cause) {
        if (!active) return;
        setState((current) =>
          current.key === key
            ? current
            : {
                key,
                user: null,
                workspace: null,
                workspaces: [],
                error:
                  cause instanceof Error
                    ? cause.message
                    : "We could not load your workspace.",
              },
        );
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [api, requestKey]);

  const settled = state.key === requestKey;
  const user = settled ? state.user : null;
  const workspace = settled ? state.workspace : null;
  const error = settled ? state.error : null;

  // A settled error is terminal for that key; otherwise we are waiting.
  const isInitialLoading = !settled || (!workspace && !error);
  const isRefreshing = settled && workspace !== null && !error;

  const refresh = useCallback(() => setRequestKey((value) => value + 1), []);

  /**
   * Switches the active workspace.
   *
   * The full workspace is re-fetched by id rather than reused from the list,
   * because the list payload is not guaranteed to carry every field
   * `GET /workspaces/:id` returns (it embeds `owner`, for one). Re-fetching
   * keeps the active workspace's shape identical to a first load.
   */
  const switchWorkspace = useCallback(
    async (id: number) => {
      if (id === workspace?.id) return;

      try {
        const next = await api.getWorkspace(id);
        writeStoredWorkspaceId(next.id);

        setState((current) => ({
          ...current,
          workspace: next,
          workspaces: current.workspaces.map((w) => (w.id === next.id ? next : w)),
        }));

        toast.success("Workspace switched", { description: next.name });
      } catch (cause) {
        toast.error("Could not switch workspace", {
          description:
            cause instanceof Error ? cause.message : "Please try again.",
        });
      }
    },
    [api, workspace?.id],
  );

  const createNotebook = useCallback(
    async (name: string) => {
      if (!workspace) {
        throw new Error("Your workspace is still loading. Try again in a moment.");
      }

      const notebook = await api.createNotebook({
        name,
        workspaceId: workspace.id,
      });

      setState((current) =>
        current.workspace
          ? {
              ...current,
              workspace: {
                ...current.workspace,
                notebooks: [notebook, ...current.workspace.notebooks],
              },
            }
          : current,
      );

      return notebook;
    },
    [api, workspace],
  );

  const deleteNotebook = useCallback(async (id: number) => {
    await api.deleteNotebook(id);
    setState((current) =>
      current.workspace
        ? {
            ...current,
            workspace: {
              ...current.workspace,
              notebooks: current.workspace.notebooks.filter(
                (notebook) => notebook.id !== id,
              ),
            },
          }
        : current,
    );
  }, [api]);

  return {
    user,
    workspace,
    workspaces: settled ? state.workspaces : [],
    notebooks: workspace?.notebooks ?? [],
    isInitialLoading,
    isRefreshing,
    error,
    refresh,
    createNotebook,
    deleteNotebook,
    switchWorkspace,
  };
}