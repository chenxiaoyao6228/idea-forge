import { findParentNode } from "@tiptap/core";
import type { Selection, Transaction } from "@tiptap/pm/state";
import { CellSelection, TableMap } from "@tiptap/pm/tables";
import type { Node, ResolvedPos } from "@tiptap/pm/model";

export interface TableCell {
  pos: number; // Position of the cell in the document
  start: number; // Starting position of cell content
  node: Node | null | undefined; // The cell node itself
}

/**
 * Checks if a rectangular area in a table is fully selected
 * @param rect - Rectangle coordinates in the table (left, right, top, bottom)
 * @param selection - Current cell selection
 * @returns Boolean indicating if the rectangle is fully selected
 */
export const isRectSelected = (rect: any) => (selection: CellSelection) => {
  // Get the table map from the current selection's anchor cell
  const map = TableMap.get(selection.$anchorCell.node(-1));
  const start = selection.$anchorCell.start(-1);

  // Get all cells in the specified rectangle
  const cells = map.cellsInRect(rect);
  // Get all cells in the current selection
  const selectedCells = map.cellsInRect(map.rectBetween(selection.$anchorCell.pos - start, selection.$headCell.pos - start));

  // Check if all cells in the specified rectangle are selected
  for (let i = 0, count = cells.length; i < count; i += 1) {
    if (selectedCells.indexOf(cells[i]) === -1) return false;
  }
  return true;
};

/**
 * Finds the parent table node from the current selection
 * @param selection - Current editor selection
 * @returns Table node information or null if not found
 */
export const findTable = (selection: Selection) => findParentNode((node) => node.type.spec.tableRole === "table")(selection);

/**
 * Checks if the current selection is a table cell selection
 * @param selection - Current editor selection
 * @returns Boolean indicating if selection is a CellSelection
 */
export const isCellSelection = (selection: any) => selection instanceof CellSelection;

/**
 * Checks if a specific column is fully selected
 * @param columnIndex - Index of the column to check
 * @param selection - Current editor selection
 * @returns Boolean indicating if column is selected
 */
export const isColumnSelected = (columnIndex: number) => (selection: any) => {
  if (isCellSelection(selection)) {
    const map = TableMap.get(selection.$anchorCell.node(-1));
    // Check if the entire column is selected
    return isRectSelected({
      left: columnIndex,
      right: columnIndex + 1,
      top: 0,
      bottom: map.height,
    })(selection);
  }
  return false;
};

/**
 * Checks if a specific row is fully selected
 * @param rowIndex - Index of the row to check
 * @param selection - Current editor selection
 * @returns Boolean indicating if row is selected
 */
export const isRowSelected = (rowIndex: number) => (selection: any) => {
  if (isCellSelection(selection)) {
    const map = TableMap.get(selection.$anchorCell.node(-1));

    return isRectSelected({
      left: 0,
      right: map.width,
      top: rowIndex,
      bottom: rowIndex + 1,
    })(selection);
  }

  return false;
};

/**
 * Checks if the entire table is selected
 * @param selection - Current editor selection
 * @returns Boolean indicating if table is fully selected
 */
export const isTableSelected = (selection: any) => {
  if (isCellSelection(selection)) {
    const map = TableMap.get(selection.$anchorCell.node(-1));

    return isRectSelected({
      left: 0,
      right: map.width,
      top: 0,
      bottom: map.height,
    })(selection);
  }

  return false;
};

/**
 * Gets all cells in specified column(s) of a table
 * @param columnIndex - Single column index or array of column indices
 * @returns Function that takes a selection and returns array of table cells or null
 */
export const getCellsInColumn =
  (columnIndex: number | number[]) =>
  (selection: Selection): TableCell[] | null => {
    // Find the parent table node from the current selection
    const table = findTable(selection);

    if (!table) return null;

    // Get the table map which contains the table's structure
    const map = TableMap.get(table.node);

    // Convert single column index to array for consistent processing
    const indexes = Array.isArray(columnIndex) ? columnIndex : Array.from([columnIndex]);

    // Process each column index and collect all cells
    return indexes.reduce<TableCell[]>((acc, index) => {
      // Skip invalid column indexes
      if (index < 0 || index >= map.width) return acc;

      // Get all cells in the current column using a rectangle
      // that spans from top to bottom of the table
      const cells = map.cellsInRect({
        left: index,
        right: index + 1,
        top: 0,
        bottom: map.height,
      });

      // Transform cell positions into detailed cell information
      const columnCells = cells.map((nodePos): TableCell => {
        const node = table.node.nodeAt(nodePos);
        const pos = nodePos + table.start;

        return {
          pos, // Absolute position in document
          start: pos + 1, // Position where cell content begins
          node, // The cell node
        };
      });

      return acc.concat(columnCells);
    }, []);
  };

/**
 * Gets all cells in specified row(s) of a table
 * @param rowIndex - Single row index or array of row indices
 * @returns Function that takes a selection and returns array of table cells or null
 */
export const getCellsInRow = (rowIndex: number | number[]) => (selection: Selection) => {
  const table = findTable(selection);

  if (!table) return null;

  const map = TableMap.get(table.node);
  // Convert single row index to array for consistent processing
  const indexes = Array.isArray(rowIndex) ? rowIndex : Array.from([rowIndex]);

  return indexes.reduce<TableCell[]>((acc, index) => {
    // Skip invalid row indexes
    if (index < 0 || index >= map.height) return acc;

    // Get all cells in the current row using a rectangle
    // that spans from left to right of the table
    const cells = map.cellsInRect({
      left: 0,
      right: map.width,
      top: index,
      bottom: index + 1,
    });

    // Transform cell positions into detailed cell information
    return acc.concat(
      cells.map((nodePos) => {
        const node = table.node.nodeAt(nodePos);
        const pos = nodePos + table.start;
        return { pos, start: pos + 1, node };
      }),
    );
  }, []);
};

/**
 * Gets all cells in the entire table
 * @param selection - Current editor selection
 * @returns Array of table cells or null if no table found
 */
export const getCellsInTable = (selection: Selection) => {
  const table = findTable(selection);

  if (!table) return null;

  const map = TableMap.get(table.node);
  // Get all cells in the table using a rectangle that covers the entire table
  const cells = map.cellsInRect({
    left: 0,
    right: map.width,
    top: 0,
    bottom: map.height,
  });

  // Transform cell positions into detailed cell information
  return cells.map((nodePos) => {
    const node = table.node.nodeAt(nodePos);
    const pos = nodePos + table.start;
    return { pos, start: pos + 1, node };
  });
};

/**
 * Finds the closest parent node that matches the predicate
 * @param $pos - Resolved position in the document
 * @param predicate - Function to test each node
 * @returns Node information or null if not found
 */
export const findParentNodeClosestToPos = ($pos: ResolvedPos, predicate: (node: Node) => boolean) => {
  // Traverse up the node tree from current position
  for (let i = $pos.depth; i > 0; i -= 1) {
    const node = $pos.node(i);

    if (predicate(node)) {
      return {
        pos: i > 0 ? $pos.before(i) : 0,
        start: $pos.start(i),
        depth: i,
        node,
      };
    }
  }
  return null;
};

/**
 * Finds the closest table cell to the given position
 * @param $pos - Resolved position in the document
 * @returns Cell node information or null if not found
 */
export const findCellClosestToPos = ($pos: ResolvedPos) => {
  const predicate = (node: Node) => node.type.spec.tableRole && /cell/i.test(node.type.spec.tableRole);
  return findParentNodeClosestToPos($pos, predicate);
};

/**
 * Creates a selection function for either row or column
 * @param type - Either "row" or "column"
 * @returns Function that creates a cell selection transaction
 */
const select = (type: "row" | "column") => (index: number) => (tr: Transaction) => {
  const table = findTable(tr.selection);
  const isRowSelection = type === "row";

  if (table) {
    const map = TableMap.get(table.node);

    // Validate index based on selection type
    if (index >= 0 && index < (isRowSelection ? map.height : map.width)) {
      // Calculate selection rectangle coordinates
      const left = isRowSelection ? 0 : index;
      const top = isRowSelection ? index : 0;
      const right = isRowSelection ? map.width : index + 1;
      const bottom = isRowSelection ? index + 1 : map.height;

      // Get cells for selection
      const cellsInFirstRow = map.cellsInRect({
        left,
        top,
        right: isRowSelection ? right : left + 1,
        bottom: isRowSelection ? top + 1 : bottom,
      });

      // Get last row cells if selection spans multiple rows
      const cellsInLastRow =
        bottom - top === 1
          ? cellsInFirstRow
          : map.cellsInRect({
              left: isRowSelection ? left : right - 1,
              top: isRowSelection ? bottom - 1 : top,
              right,
              bottom,
            });

      // Create cell selection
      const head = table.start + cellsInFirstRow[0];
      const anchor = table.start + cellsInLastRow[cellsInLastRow.length - 1];
      const $head = tr.doc.resolve(head);
      const $anchor = tr.doc.resolve(anchor);

      return tr.setSelection(new CellSelection($anchor, $head));
    }
  }
  return tr;
};

/**
 * Creates a selection for a specific column
 * @param index - Column index to select
 * @returns Transaction with column selection
 */
export const selectColumn = select("column");

/**
 * Creates a selection for a specific row
 * @param index - Row index to select
 * @returns Transaction with row selection
 */
export const selectRow = select("row");

/**
 * Creates a selection that encompasses the entire table
 * @param tr - Current transaction
 * @returns Updated transaction with table selection
 */
export const selectTable = (tr: Transaction) => {
  const table = findTable(tr.selection);

  if (table) {
    const { map } = TableMap.get(table.node);

    if (map?.length) {
      // Select from first to last cell in table
      const head = table.start + map[0];
      const anchor = table.start + map[map.length - 1];
      const $head = tr.doc.resolve(head);
      const $anchor = tr.doc.resolve(anchor);

      return tr.setSelection(new CellSelection($anchor, $head));
    }
  }

  return tr;
};
