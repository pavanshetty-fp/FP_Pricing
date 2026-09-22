/*
  CSV EXPORT — one implementation, because "export" means the same thing on
  every list and a second copy is a second set of quoting bugs.

  EXPORT MEANS "THE ROWS I AM LOOKING AT" — filtered, searched and sorted, all
  pages of them. Exporting the page would be a surprise; exporting the whole
  table would ignore the narrowing somebody just did.
*/
export function downloadCsv(
  name: string,
  records: Record<string, string | number>[]
): void {
  if (records.length === 0) return;
  const headers = Object.keys(records[0]);
  const cell = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...records.map((r) => headers.map((h) => cell(r[h])).join(",")),
  ].join("\n");

  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
