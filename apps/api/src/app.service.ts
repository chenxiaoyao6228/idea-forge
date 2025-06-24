import { Injectable } from "@nestjs/common";
import { I18nContextManager } from "./_shared/i18next/i18n.context";
import { ClsService } from "nestjs-cls";

@Injectable()
export class AppService {
  constructor(private readonly cls: ClsService) {}

  getHello(): string {
    return "yyy";
  }

  testI18n(): string {
    console.log("testI18n");
    const t = I18nContextManager.getT();
    return t("helloworld", { name: "John" });
  }

  testIp(): string {
    const ip = this.cls.get("ip");
    return ip;
  }
}
