import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import { AppBar } from "@/components/layout/AppBar";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";
import { ErrorState } from "@/components/layout/ErrorState";
import {
  WorkspaceFooter,
  WorkspaceHeading,
  WorkspaceSectionLabel,
} from "@/components/workspace/WorkspaceChrome";
import { CreateNotebookDialog } from "@/components/workspace/CreateNotebookDialog";
import { NotebookCard } from "@/components/workspace/NotebookCard";
import {
  NotebookGridSkeleton,
  WorkspaceEmptyState,
} from "@/components/workspace/WorkspaceStates";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useNotebookSourceCounts } from "@/hooks/useNotebookCounts";
import { Button } from "@/components/ui/button";
import {
  ConfirmDialog,
  type ConfirmRequest,
} from "@/components/layout/ConfirmDialog";
import type { Notebook } from "@/types";

export default function WorkspacePage() {
  const navigate = useNavigate();
  const {
    workspace,
    workspaces,
    notebooks,
    isInitialLoading,
    error,
    refresh,
    createNotebook,
    deleteNotebook,
    switchWorkspace,
  } = useWorkspace();

  const sourceCounts = useNotebookSourceCounts(notebooks);

  const [isCreateOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  // Creating a notebook means the user wants to use it immediately.
  const handleCreate = useCallback(
    async (name: string) => {
      const notebook = await createNotebook(name);
      navigate(`/notebook/${notebook.id}`);
      return notebook;
    },
    [createNotebook, navigate],
  );

  const handleDeleteRequest = useCallback(
    (notebook: Notebook) => {
      setConfirm({
        title: "Delete this notebook?",
        description: `“${notebook.name}” and all of its sources will be deleted. This cannot be undone.`,
        confirmLabel: "Delete notebook",
        onConfirm: async () => {
          setDeletingId(notebook.id);
          try {
            await deleteNotebook(notebook.id);
            toast.success("Notebook deleted", {
              description: `“${notebook.name}” is gone.`,
            });
          } finally {
            setDeletingId(null);
          }
        },
      });
    },
    [deleteNotebook],
  );

  const showSkeleton = isInitialLoading;
  const showError = Boolean(error) && !isInitialLoading;

  return (
    <WorkspaceShell>
      <AppBar>
        <WorkspaceSwitcher
          workspaces={workspaces}
          activeWorkspace={workspace}
          isLoading={isInitialLoading}
          onSwitch={(id) => void switchWorkspace(id)}
        />
      </AppBar>

      <main className="mx-auto w-full max-w-[68rem] flex-1 px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
        <WorkspaceHeading
          title="Your knowledge, organized."
          description="A quiet place for the sources you want to think with."
          action={
            notebooks.length > 0 ? (
              <Button onClick={() => setCreateOpen(true)}>
                <PlusIcon />
                New notebook
              </Button>
            ) : null
          }
        />

        <div className="mt-10">
          {notebooks.length > 0 ? (
            <WorkspaceSectionLabel count={notebooks.length} />
          ) : null}
        </div>

        <div className="mt-6">
          {showError ? (
            <ErrorState
              title="We could not load your workspace"
              message={error ?? ""}
              onRetry={refresh}
            />
          ) : showSkeleton ? (
            <NotebookGridSkeleton />
          ) : notebooks.length === 0 ? (
            <>
              <WorkspaceEmptyState />
              <Button
                onClick={() => setCreateOpen(true)}
                className="mt-6 w-full sm:w-auto"
              >
                <PlusIcon />
                New notebook
              </Button>
            </>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {notebooks.map((notebook) => (
                <li key={notebook.id}>
                  <NotebookCard
                    notebook={notebook}
                    sourceCount={sourceCounts[notebook.id]}
                    isDeleting={deletingId === notebook.id}
                    onDelete={handleDeleteRequest}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <WorkspaceFooter
          workspaceName={workspace?.name}
          isLoading={isInitialLoading}
          syncedAt={isInitialLoading ? undefined : new Date()}
        />
      </main>

      <CreateNotebookDialog
        open={isCreateOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />

      <ConfirmDialog
        request={confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
      />
    </WorkspaceShell>
  );
}