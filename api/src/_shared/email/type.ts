import { I18nService } from "nestjs-i18n";
import { I18nTranslations } from "@/_generated/i18n.generated";

export type EmailTemplateProps = {
  i18n: I18nService<I18nTranslations>;
};
