import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileTypeIcon } from "@/components/ui/file-type-icon";

/*
  THE DOCUMENTS TABLE — one for every record that keeps files (3PL Delivery
  Orders, the portal's order requests and invoice disputes). The 3PL
  anatomy, which is the source of truth (Pavan, 2026-10-14):

    Document (its format icon, then the name) · Added · By · ↓
    (No Kind column — Pavan, 2026-10-14: the format icon says what it is.)

  ALWAYS A TABLE, AND NEVER EMPTY OF ROWS. With nothing uploaded it still
  holds one row (Pavan, 2026-10-14): where the reader can add, that row IS
  the upload — press it to pick files; where they cannot, it says what will
  arrive. The section never changes shape when the first file lands.
*/

export interface DocumentRow {
  id: string;
  kind: string;
  name: string;
  /** Already formatted for reading. */
  added: string;
  by: string;
}

export function DocumentsTable({
  rows,
  onAdd,
  emptyText = "No documents yet.",
  onDownload,
}: {
  rows: DocumentRow[];
  /** Given, the empty row is an upload slot. */
  onAdd?: () => void;
  /** The empty row's words when there is no upload here. */
  emptyText?: string;
  onDownload?: (row: DocumentRow) => void;
}) {
  return (
    <table className="w-full table-fixed text-sm">
      <colgroup>
        <col />
        <col className="w-[18%]" />
        <col className="w-[20%]" />
        <col className="w-12" />
      </colgroup>
      <thead>
        <tr className="border-b border-border bg-fp-table-header">
          {["Document", "Added", "By"].map((h) => (
            <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
              {h}
            </th>
          ))}
          <th className="w-10 px-3 py-2" />
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 &&
          (onAdd ? (
            /* THE EMPTY ROW IS THE UPLOAD. */
            <tr className="h-12 cursor-pointer border-b border-border last:border-0 hover:bg-fp-row-hover" onClick={onAdd}>
              <td className="px-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd();
                  }}
                  className="flex items-center gap-2 rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <Upload className="size-4" />
                  Upload a document
                </button>
              </td>
              <td className="px-3 text-muted-foreground">—</td>
              <td className="px-3 text-muted-foreground">—</td>
              <td />
            </tr>
          ) : (
            <tr className="h-12">
              <td colSpan={4} className="px-3 text-muted-foreground">
                {emptyText}
              </td>
            </tr>
          ))}
        {rows.map((doc) => (
          <tr key={doc.id} className="h-12 border-b border-border last:border-0">
            <td className="px-3">
              <span className="flex min-w-0 items-center gap-2.5">
                <FileTypeIcon name={doc.name} />
                <span className="truncate text-foreground" title={doc.name}>
                  {doc.name}
                </span>
              </span>
            </td>
            <td className="truncate px-3 text-muted-foreground">{doc.added}</td>
            <td className="truncate px-3 text-muted-foreground">{doc.by}</td>
            <td className="px-2">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Download ${doc.name}`}
                className="text-muted-foreground"
                onClick={() => onDownload?.(doc)}
              >
                <Download />
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
