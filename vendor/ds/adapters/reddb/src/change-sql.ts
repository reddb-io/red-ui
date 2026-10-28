/** A RedDB cell update, supplied by the workspace change queue. */
export interface RedDbCellUpdate {
  table: string;
  row: number;
  col: string;
  newValue: string;
}

/** Whether an update target can be represented safely in RedDB SQL. */
export function isSafeCellUpdateTarget(change: Pick<RedDbCellUpdate, "table" | "col" | "row">): boolean {
  const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;
  return change.table.split('.').every(part => identifier.test(part)) && identifier.test(change.col) && Number.isSafeInteger(change.row) && change.row >= 0;
}

/** Generate a RedDB update statement accepted by the query endpoint. */
export function buildUpdateSql(change: RedDbCellUpdate): string {
  if (!isSafeCellUpdateTarget(change)) throw new Error("Invalid RedDB cell update target.");
  const value = `'${change.newValue.replace(/'/g, "''")}'`;
  return `UPDATE ${change.table} SET ${change.col} = ${value} WHERE rid = ${change.row}`;
}
