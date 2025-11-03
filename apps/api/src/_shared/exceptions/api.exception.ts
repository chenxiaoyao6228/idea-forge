import { HttpException } from "@nestjs/common";
import { HttpStatus } from "@nestjs/common";
import { type ErrorCodeEnum } from "@/_shared/constants/api-response-constant";

export class ApiException extends HttpException {
  private errorCode: ErrorCodeEnum;
  private readonly data?: any;

  constructor(errorCode: ErrorCodeEnum, statusCode: HttpStatus = HttpStatus.OK, data?: any) {
    super(errorCode, statusCode, data);
    this.errorCode = errorCode;
    this.data = data;
  }

  gerErrorCode(): ErrorCodeEnum {
    return this.errorCode;
  }

  getData(): any {
    return this.data;
  }
}
