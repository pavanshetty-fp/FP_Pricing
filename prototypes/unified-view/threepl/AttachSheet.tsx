import * as React from "react";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import { FileUpload, type UploadedFile } from "@/components/form-layout/FileUpload";
import { RecordSheet } from "../RecordSheet";
import type { OrderDocumentKind } from "./BrokerOrderSheet";

/*
  ATTACH — the sheet over a completed order that takes its paperwork (Pavan,
  2026-10-05). Two doors, one sheet: supporting images (photos from the site)
  or documents (a BOL, a ticket, an invoice). It is opened from the order's
  footer once the job is done, and what it attaches lands in the order's
  Additional Details.

  A SHEET OVER A SHEET, so level 2. Nothing is kept until Attach is pressed —
  picking files is choosing, not editing the order.
*/

const DOC_KINDS: OrderDocumentKind[] = ["BOL", "Ticket", "Invoice", "Other"];

export interface AttachedFile {
  name: string;
  size: string;
  /** Documents only. */
  kind?: OrderDocumentKind;
}

export function AttachSheet({
  what,
  open,
  onOpenChange,
  onAttach,
}: {
  what: "images" | "documents";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttach: (files: AttachedFile[]) => void;
}) {
  const [files, setFiles] = React.useState<UploadedFile[]>([]);
  const [kind, setKind] = React.useState<OrderDocumentKind>("BOL");
  const images = what === "images";
  const attach = () => {
    onAttach(
      files.map((f) => ({ name: f.name, size: f.size, kind: images ? undefined : kind }))
    );
    onOpenChange(false);
  };

  return (
    <RecordSheet
      size="narrow"
      level={2}
      open={open}
      onOpenChange={onOpenChange}
      mode="create"
      editTitle=""
      createTitle={images ? "Attach supporting images" : "Attach documents"}
      createAction="Attach"
      showCancel={false}
      canSubmit={files.length > 0}
      onSubmit={attach}
      footerPrimary={
        <Button disabled={files.length === 0} onClick={attach}>
          <Paperclip />
          {files.length > 1 ? `Attach ${files.length} files` : "Attach"}
        </Button>
      }
    >
      {!images && (
        <SheetSection title="Document type" variant="plain">
          <SheetField>
            <ToggleGroup
              type="single"
              variant="outline"
              value={kind}
              onValueChange={(v) => v && setKind(v as OrderDocumentKind)}
              className="w-fit"
            >
              {DOC_KINDS.map((k) => (
                <ToggleGroupItem key={k} value={k} className="px-3">
                  {k}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </SheetField>
        </SheetSection>
      )}
      <SheetSection title={images ? "Images" : "Files"} variant="plain">
        <FileUpload
          variant="field"
          label={images ? "Choose images to upload" : "Choose documents to upload"}
          note={
            images
              ? "JPG or PNG, under 5 MB each."
              : "PDF or DOC, under 5 MB each."
          }
          accept={images ? "image/*" : ".pdf,.doc,.docx"}
          onFilesChange={setFiles}
        />
      </SheetSection>
    </RecordSheet>
  );
}
