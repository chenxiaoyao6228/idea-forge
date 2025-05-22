import * as React from "react";
import { useNavigate } from "react-router-dom";
import { FileIcon } from "lucide-react";
import { NavigationItem, NavigationItemProps } from "./navigation-item";
import { CommonDocumentResponse } from "contracts";

interface FileNavigationItemProps extends Omit<NavigationItemProps, "icon" | "label" | "onClick"> {
  document: CommonDocumentResponse;
}

export function FileNavigationItem({ document, ...props }: FileNavigationItemProps) {
  const navigate = useNavigate();

  return <NavigationItem icon={<FileIcon className="h-4 w-4" />} label={document.title} onClick={() => navigate(`/${document.id}`)} {...props} />;
}
