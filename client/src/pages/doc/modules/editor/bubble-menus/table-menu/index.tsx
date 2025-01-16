import { TableRowMenu } from "./table-row-menu";
import { TableColMenu } from "./table-col-menu";
import type { MenuProps } from "../type";

export const TableMenu = (props: MenuProps) => {
  const { editor, containerRef } = props;
  return (
    <>
      <TableRowMenu editor={editor} containerRef={containerRef} />
      <TableColMenu editor={editor} containerRef={containerRef} />
    </>
  );
};
