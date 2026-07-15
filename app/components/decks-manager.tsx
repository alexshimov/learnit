"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Search,
  Folder,
  GripVertical,
  ChevronRight,
  Play,
  X,
} from "@/app/components/icons";
import type { DeckOverview } from "@/lib/queries";
import {
  organizeDecksAction,
  renameDeckAction,
  setDeckTagsAction,
  createFolderAction,
  renameFolderAction,
  deleteFolderAction,
} from "@/app/actions";

type FolderT = { id: string; name: string };

function byName(a: FolderT, b: FolderT) {
  return a.name.localeCompare(b.name);
}

/** Map a tag to one of 6 palette classes — deterministic, so a tag keeps the
 *  same color across the filter bar and every deck row. */
function tagClass(tag: string): string {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (Math.imul(h, 31) + tag.charCodeAt(i)) >>> 0;
  return `tc tc${h % 6}`;
}

/** Flatten decks into folder-grouped order (folders A→Z, then ungrouped),
 *  preserving each group's existing relative order. */
function regroup(decks: DeckOverview[], folders: FolderT[]): DeckOverview[] {
  const out: DeckOverview[] = [];
  for (const f of [...folders].sort(byName)) {
    out.push(...decks.filter((d) => d.folderId === f.id));
  }
  out.push(...decks.filter((d) => d.folderId == null));
  return out;
}

function persist(decks: DeckOverview[]) {
  void organizeDecksAction(decks.map((d) => ({ id: d.id, folderId: d.folderId })));
}

type RowCallbacks = {
  onRename: (id: string, title: string) => void;
  onTags: (id: string, tags: string[]) => void;
  onMove: (id: string, folderId: string | null) => void;
  onTagClick: (tag: string) => void;
};

export function DecksManager({
  decks: initialDecks,
  folders: initialFolders,
}: {
  decks: DeckOverview[];
  folders: FolderT[];
}) {
  const [decks, setDecks] = useState(() => regroup(initialDecks, initialFolders));
  const [folders, setFolders] = useState(initialFolders);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem("learnit:collapsed-folders");
      if (raw) setCollapsed(new Set(JSON.parse(raw) as string[]));
    } catch {}
  }, []);

  function toggleCollapse(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem("learnit:collapsed-folders", JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const d of decks) for (const t of d.tags) s.add(t);
    return [...s].sort();
  }, [decks]);

  const isFiltering = search.trim() !== "" || tagFilter !== null;
  const dnd = mounted && !isFiltering;

  function visible(deck: DeckOverview): boolean {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      deck.title.toLowerCase().includes(q) ||
      deck.tags.some((t) => t.toLowerCase().includes(q));
    const matchesTag = !tagFilter || deck.tags.includes(tagFilter);
    return matchesSearch && matchesTag;
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const a = decks.find((d) => d.id === active.id);
    const o = decks.find((d) => d.id === over.id);
    if (!a || !o || a.folderId !== o.folderId) return;
    const groupIds = decks.filter((d) => d.folderId === a.folderId).map((d) => d.id);
    const moved = arrayMove(
      groupIds,
      groupIds.indexOf(active.id as string),
      groupIds.indexOf(over.id as string),
    );
    const map = new Map(decks.map((d) => [d.id, d]));
    const reordered = moved.map((id) => map.get(id)!);
    const rest = decks.filter((d) => d.folderId !== a.folderId);
    const next = regroup([...rest, ...reordered], folders);
    setDecks(next);
    persist(next);
  }

  function moveToFolder(deckId: string, folderId: string | null) {
    const deck = decks.find((d) => d.id === deckId);
    if (!deck) return;
    const without = decks.filter((d) => d.id !== deckId);
    const next = regroup([...without, { ...deck, folderId }], folders);
    setDecks(next);
    persist(next);
  }

  function rename(deckId: string, title: string) {
    setDecks((ds) => ds.map((d) => (d.id === deckId ? { ...d, title } : d)));
    void renameDeckAction(deckId, title);
  }

  function setTags(deckId: string, tags: string[]) {
    setDecks((ds) => ds.map((d) => (d.id === deckId ? { ...d, tags } : d)));
    void setDeckTagsAction(deckId, tags);
    if (tagFilter && !tags.includes(tagFilter)) setTagFilter(null);
  }

  async function addFolder(name: string) {
    const r = await createFolderAction(name);
    if (r.ok) {
      const nf = [...folders, { id: r.id, name: r.name }];
      setFolders(nf);
      setDecks((ds) => regroup(ds, nf));
    }
    setNewFolder(null);
  }

  function renameFolderLocal(id: string, name: string) {
    const nf = folders.map((f) => (f.id === id ? { ...f, name } : f));
    setFolders(nf);
    setDecks((ds) => regroup(ds, nf));
    void renameFolderAction(id, name);
  }

  function deleteFolderLocal(id: string) {
    const nf = folders.filter((f) => f.id !== id);
    const nd = decks.map((d) => (d.folderId === id ? { ...d, folderId: null } : d));
    setFolders(nf);
    setDecks(regroup(nd, nf));
    void deleteFolderAction(id);
  }

  const callbacks: RowCallbacks = {
    onRename: rename,
    onTags: setTags,
    onMove: moveToFolder,
    onTagClick: setTagFilter,
  };

  const sortedFolders = [...folders].sort(byName);
  const ungrouped = decks.filter((d) => d.folderId == null);

  function section(keyId: string, name: ReactNode, groupDecks: DeckOverview[], folder?: FolderT) {
    const shown = groupDecks.filter(visible);
    if (isFiltering && shown.length === 0) return null;
    const isCollapsed = !isFiltering && collapsed.has(keyId);
    const rows = shown.map((deck) =>
      dnd ? (
        <SortableDeckRow key={deck.id} deck={deck} folders={sortedFolders} {...callbacks} />
      ) : (
        <DeckRowView key={deck.id} deck={deck} folders={sortedFolders} grip={null} {...callbacks} />
      ),
    );
    return (
      <div key={keyId} className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 px-1">
          <button
            type="button"
            onClick={() => toggleCollapse(keyId)}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Expand section" : "Collapse section"}
            className="flex shrink-0 items-center gap-2"
          >
            <ChevronRight
              size={14}
              style={{
                color: "var(--text-muted)",
                transition: "transform 0.15s",
                transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
              }}
            />
            <Folder size={15} style={{ color: "var(--text-muted)" }} />
          </button>
          {folder ? (
            <FolderHeader folder={folder} onRename={renameFolderLocal} onDelete={deleteFolderLocal} />
          ) : (
            <span className="eyebrow2">{name}</span>
          )}
          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            {groupDecks.length}
          </span>
        </div>
        {isCollapsed ? null : shown.length === 0 ? (
          <p className="px-1 text-[12px]" style={{ color: "var(--text-muted)" }}>
            Empty — move decks here from their ⋯ menu.
          </p>
        ) : dnd ? (
          <SortableContext items={shown.map((d) => d.id)} strategy={verticalListSortingStrategy}>
            <div className="card overflow-hidden">{rows}</div>
          </SortableContext>
        ) : (
          <div className="card overflow-hidden">{rows}</div>
        )}
      </div>
    );
  }

  const list = (
    <div className="flex flex-col gap-5">
      {sortedFolders.map((f) => section(f.id, f.name, decks.filter((d) => d.folderId === f.id), f))}
      {section("ungrouped", "Ungrouped", ungrouped)}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Decks</h1>
        <Link href="/import" className="flex items-center gap-1.5 text-[14px]" style={{ color: "var(--brand)" }}>
          <Plus size={17} /> New
        </Link>
      </header>

      <div
        className="flex items-center gap-2 rounded-xl px-3"
        style={{ background: "var(--surface-1)", border: "0.5px solid var(--border)" }}
      >
        <Search size={16} style={{ color: "var(--text-muted)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search decks and tags"
          className="w-full bg-transparent py-2.5 text-[14px] outline-none"
          style={{ color: "var(--text-primary)" }}
        />
        {search && (
          <button onClick={() => setSearch("")} aria-label="Clear search">
            <X size={15} style={{ color: "var(--text-muted)" }} />
          </button>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(tagFilter === t ? null : t)}
              className={`chip ${tagClass(t)}${tagFilter === t ? " on" : ""}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {dnd ? (
        <DndContext
          id="decks-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          {list}
        </DndContext>
      ) : (
        list
      )}

      <div>
        {newFolder !== null ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newFolder.trim()) addFolder(newFolder.trim());
                if (e.key === "Escape") setNewFolder(null);
              }}
              placeholder="Folder name"
              className="flex-1 rounded-lg px-3 py-2 text-[14px] outline-none"
              style={{ background: "var(--surface-1)", border: "0.5px solid var(--border)", color: "var(--text-primary)" }}
            />
            <button
              onClick={() => newFolder.trim() && addFolder(newFolder.trim())}
              className="btn-brand px-4 py-2 text-[13px]"
            >
              Create
            </button>
            <button onClick={() => setNewFolder(null)} className="btn-ghost px-4 py-2 text-[13px]">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setNewFolder("")}
            className="btn-ghost flex items-center gap-2 px-4 py-2.5 text-[14px]"
          >
            <Plus size={15} /> New folder
          </button>
        )}
      </div>
    </div>
  );
}

function FolderHeader({
  folder,
  onRename,
  onDelete,
}: {
  folder: FolderT;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(folder.name);
  const [confirm, setConfirm] = useState(false);

  if (editing) {
    return (
      <span className="flex flex-1 items-center gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) {
              onRename(folder.id, name.trim());
              setEditing(false);
            }
            if (e.key === "Escape") setEditing(false);
          }}
          className="rounded-md px-2 py-1 text-[13px] outline-none"
          style={{ background: "var(--surface-1)", border: "0.5px solid var(--border)", color: "var(--text-primary)" }}
        />
        <button
          onClick={() => {
            if (name.trim()) onRename(folder.id, name.trim());
            setEditing(false);
          }}
          className="text-[12px]"
          style={{ color: "var(--brand)" }}
        >
          Save
        </button>
      </span>
    );
  }

  return (
    <span className="flex flex-1 items-center gap-2">
      <span className="eyebrow2">{folder.name}</span>
      <button onClick={() => setEditing(true)} className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        rename
      </button>
      {confirm ? (
        <>
          <button onClick={() => onDelete(folder.id)} className="text-[11px]" style={{ color: "var(--danger)" }}>
            delete?
          </button>
          <button onClick={() => setConfirm(false)} className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            no
          </button>
        </>
      ) : (
        <button onClick={() => setConfirm(true)} className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          delete
        </button>
      )}
    </span>
  );
}

function SortableDeckRow(props: { deck: DeckOverview; folders: FolderT[] } & RowCallbacks) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.deck.id,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };
  const grip = (
    <button
      {...attributes}
      {...listeners}
      aria-label="Drag to reorder"
      className="shrink-0 cursor-grab touch-none px-1"
      style={{ color: "var(--text-muted)" }}
    >
      <GripVertical size={18} />
    </button>
  );
  return <DeckRowView {...props} grip={grip} innerRef={setNodeRef} style={style} />;
}

function DeckRowView({
  deck,
  folders,
  grip,
  innerRef,
  style,
  onRename,
  onTags,
  onMove,
  onTagClick,
}: {
  deck: DeckOverview;
  folders: FolderT[];
  grip: ReactNode;
  innerRef?: (node: HTMLElement | null) => void;
  style?: CSSProperties;
} & RowCallbacks) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(deck.title);
  const [tags, setTagsVal] = useState(deck.tags.join(", "));

  return (
    <div ref={innerRef} style={{ borderTop: "0.5px solid var(--border)", ...style }}>
      <div className="flex items-start gap-2 px-2 py-2.5">
        {grip}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Link href={`/decks/${deck.id}`} className="min-w-0">
            <p className="truncate text-[14px] font-medium">{deck.title}</p>
            <p className="truncate text-[12px]" style={{ color: "var(--text-muted)" }}>
              {deck.topic ? `${deck.topic} · ` : ""}
              {deck.total} card{deck.total === 1 ? "" : "s"}
            </p>
          </Link>
          {(deck.due > 0 || deck.tags.length > 0) && (
            <div className="flex flex-wrap items-center gap-1">
              {deck.due > 0 && (
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    background: "var(--brand-tint)",
                    border: "0.5px solid var(--brand-line)",
                    color: "var(--brand)",
                  }}
                >
                  {deck.due} due
                </span>
              )}
              {deck.tags.map((t) => (
                <button
                  key={t}
                  onClick={() => onTagClick(t)}
                  className={`chip ${tagClass(t)}`}
                  style={{ fontSize: 11, padding: "3px 8px" }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => {
            setTitle(deck.title);
            setTagsVal(deck.tags.join(", "));
            setOpen((o) => !o);
          }}
          aria-label="Deck options"
          className="shrink-0 px-2 py-1 text-[18px] leading-none"
          style={{ color: "var(--text-muted)" }}
        >
          ⋯
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-3 px-3 pb-3.5 pt-1" style={{ background: "var(--surface-0)" }}>
          <div className="flex flex-col gap-1.5">
            <span className="eyebrow2">Rename</span>
            <div className="flex gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 rounded-lg px-3 py-2 text-[13px] outline-none"
                style={{ background: "var(--surface-1)", border: "0.5px solid var(--border)", color: "var(--text-primary)" }}
              />
              <button
                onClick={() => title.trim() && title.trim() !== deck.title && onRename(deck.id, title.trim())}
                className="btn-ghost px-3 py-2 text-[12px]"
              >
                Save
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="eyebrow2">Tags (comma-separated)</span>
            <div className="flex gap-2">
              <input
                value={tags}
                onChange={(e) => setTagsVal(e.target.value)}
                placeholder="e.g. work, spanish"
                className="flex-1 rounded-lg px-3 py-2 text-[13px] outline-none"
                style={{ background: "var(--surface-1)", border: "0.5px solid var(--border)", color: "var(--text-primary)" }}
              />
              <button
                onClick={() => onTags(deck.id, tags.split(",").map((t) => t.trim()).filter(Boolean))}
                className="btn-ghost px-3 py-2 text-[12px]"
              >
                Save
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="eyebrow2">Folder</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onMove(deck.id, null)}
                className="chip"
                style={
                  deck.folderId == null
                    ? { background: "var(--brand-tint)", borderColor: "var(--brand-line)", color: "var(--brand)" }
                    : undefined
                }
              >
                None
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onMove(deck.id, f.id)}
                  className="chip"
                  style={
                    deck.folderId === f.id
                      ? { background: "var(--brand-tint)", borderColor: "var(--brand-line)", color: "var(--brand)" }
                      : undefined
                  }
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/review?deck=${deck.id}`}
              className="btn-brand flex items-center gap-1.5 px-4 py-2 text-[13px]"
            >
              <Play size={13} /> Study
            </Link>
            <Link href={`/decks/${deck.id}`} className="btn-ghost flex items-center gap-1.5 px-4 py-2 text-[13px]">
              Manage <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
