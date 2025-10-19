import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@idea/ui/shadcn/ui/select';
import { useTranslation } from "react-i18next";
import { SubspaceType } from "@idea/contracts";
import { cx } from "class-variance-authority";
import { SubspaceIcon } from "@/components/subspace-icon";
import { useSubspaceLabels } from "@/hooks/use-subspace-labels";

interface SubspaceTypeSelectorProps {
  value: SubspaceType;
  onChange: (value: SubspaceType) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function SubspaceTypeSelector({ value, onChange, disabled = false, className, id }: SubspaceTypeSelectorProps) {
  const { t } = useTranslation();
  const { getAllSubspaceTypes } = useSubspaceLabels();

  const subspaceTypes = getAllSubspaceTypes();

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cx("w-auto min-w-[200px]", className)} id={id}>
        <div className="flex items-center gap-2">
          <SelectValue placeholder={t("Select subspace type")} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {subspaceTypes.map((type) => (
          <SelectItem key={type.value} value={type.value}>
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <SubspaceIcon type={type.value} size="sm" withBackground />
                  <span>{type.label}</span>
                  {/* {type.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {type.badge}
                    </Badge>
                  )} */}
                </div>
                {/* <span className="text-xs text-muted-foreground">{type.description}</span> */}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
